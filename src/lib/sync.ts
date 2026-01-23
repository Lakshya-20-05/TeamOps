import type { RxCollection, RxReplicationWriteToMasterRow } from 'rxdb';
import { supabase } from './supabase';
import { replicateRxCollection } from 'rxdb/plugins/replication';

/**
 * Replicates an RxDB collection with a Supabase table.
 * 
 * @param collection The RxDB collection to replicate
 * @param tableName The Supabase table name (e.g., 'tasks')
 * @param mapping Function to map local Doc -> Remote Row (handling camelCase -> snake_case) and Remote Row -> local Doc
 */
export const syncCollection = async (
    collection: RxCollection,
    tableName: string,
    mapToRemote: (doc: any) => any,
    mapToLocal: (row: any) => any
) => {

    // Helper to pause execution until online
    const waitForOnline = async () => {
        if (navigator.onLine) return;
        // console.debug('[Sync] Offline. Waiting for network...');
        await new Promise<void>(resolve => {
            window.addEventListener('online', () => resolve(), { once: true });
        });
        // console.debug('[Sync] Online. Resuming...');
    };

    // 1. Pull Handler (Download from Supabase)
    const pullHandler = async (checkpoint: any, batchSize: number) => {
        await waitForOnline();

        // checkpoint format: { updated_at: string, id: string }
        const lastUpdatedAt = checkpoint ? checkpoint.updated_at : new Date(0).toISOString();
        const lastId = checkpoint ? checkpoint.id : '00000000-0000-0000-0000-000000000000'; // Min UUID

        // DEBUG LOG
        // console.log(`[Sync ${tableName}] Checkpoint:`, { lastUpdatedAt, lastId });

        window.dispatchEvent(new CustomEvent('sync-active', { detail: { table: tableName, type: 'pull' } }));
        try {
            // Tuple-like Cursor Pagination: (updated_at > T) OR (updated_at = T AND id > ID)
            // This ensures we always move forward, even through clumps of identical timestamps.

            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .or(`updated_at.gt.${lastUpdatedAt},and(updated_at.eq.${lastUpdatedAt},id.gt.${lastId})`)
                .order('updated_at', { ascending: true })
                .order('id', { ascending: true })
                .limit(batchSize);

            if (error) throw error;

            console.log(`[Sync ${tableName}] Pulled ${data?.length} rows. Range: ${data[0]?.updated_at} -> ${data[data.length - 1]?.updated_at}`);

            // CRITICAL FIX: Do NOT filter locally. 
            // If we return fewer documents than batchSize, RxDB thinks sync is done!
            // Let RxDB handle deduplication (Upsert is idempotent).
            const documents = data.map(row => mapToLocal(row));

            let newCheckpoint = checkpoint;
            if (data.length > 0) {
                const lastRow = data[data.length - 1];
                newCheckpoint = {
                    updated_at: lastRow.updated_at,
                    id: lastRow.id
                };
            }

            return {
                documents,
                checkpoint: newCheckpoint
            };
        } catch (err: any) {
            // Silence offline errors
            if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
                // Debug level log only
                console.debug(`[Sync ${tableName}] Offline - Pull skipped.`);
                // Do not re-throw, let RxDB retry silently
                // But we must return a compatible response to stop RxDB from freaking out?
                // Actually, throwing is fine for RxDB to retry, but we just don't want global error handlers to see it.
                // If we swallow it, RxDB might think it succeeded with empty data.
                // Better to throw a specific "Offline" error that we ignore elsewhere?
                // For now, re-throwing is required for retry logic, but we've handled the global noise.
            } else {
                console.error(`Pull error for ${tableName}:`, err);
            }
            window.dispatchEvent(new CustomEvent('sync-error', { detail: { table: tableName, error: err } }));
            throw err;
        }
    };

    // 2. Push Handler (Upload to Supabase)
    // 2. Push Handler (Upload to Supabase)
    const pushHandler = async (rows: RxReplicationWriteToMasterRow<any>[]) => {
        await waitForOnline();
        window.dispatchEvent(new CustomEvent('sync-active', { detail: { table: tableName, type: 'push' } }));
        try {
            console.log(`[Sync] Pushing ${rows.length} rows to ${tableName}`);

            const rowsToUpsert = rows.map(r => {
                // Map local doc to remote row. 
                // If local doc is deleted (r.newDocumentState._deleted), mapToRemote will now set 'deleted: true'
                return mapToRemote(r.newDocumentState);
            });

            // Handle Upserts (Soft Deletes are just Upserts with deleted=true)
            const { error } = await supabase
                .from(tableName)
                .upsert(rowsToUpsert, { onConflict: 'id' });

            if (error) throw error;
            console.log(`[Sync] Upserted ${rowsToUpsert.length} rows to ${tableName}`);

            return []; // No conflicts
        } catch (err: any) {
            if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
                console.debug(`[Sync ${tableName}] Offline - Push skipped.`);
            } else {
                console.error(`Push error for ${tableName}:`, err);
                // Hint for common errors
                if (err.code === '42P01') console.error(`Table '${tableName}' does not exist in Supabase.`);
                if (err.code === '401' || err.code === '403') console.error(`RLS Policy violation for '${tableName}'. Check Supabase policies.`);
            }

            window.dispatchEvent(new CustomEvent('sync-error', { detail: { table: tableName, error: err } }));
            throw err;
        }
    };

    // 3. Realtime Stream (Supabase Channels)
    const { Subject } = await import('rxjs');
    const stream$ = new Subject<any>();

    // Subscribe to Supabase Realtime
    const channel = supabase.channel(`public:${tableName}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: tableName },
            (payload) => {
                console.log(`[Sync] Realtime change received for ${tableName}:`, payload);
                if (payload.errors) return;

                // For 'INSERT' and 'UPDATE', we get the new row
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const doc = mapToLocal(payload.new);
                    stream$.next({
                        documents: [doc],
                        checkpoint: { updated_at: payload.new.updated_at || new Date().toISOString() }
                    });
                }
                // We ignore 'DELETE' events because we use Soft Deletes (UPDATE deleted=true)
            }
        )
        .subscribe();


    console.log(`Starting replication for ${tableName}...`);

    const replicationState = await replicateRxCollection({
        collection,
        replicationIdentifier: `sync-v9-${tableName}`, // Bumped to v9 (Projects/Activities hierarchy)
        pull: {
            handler: pullHandler,
            batchSize: 50,
            modifier: (doc) => doc,
            stream$: stream$, // Enable Realtime
        },
        push: {
            handler: pushHandler,
            batchSize: 50
        },
        live: true,
        retryTime: 5000,
        waitForLeadership: false, // Allow all tabs to receive updates (important for multi-tab sync)
        autoStart: true,
    });

    // Cleanup channel on replication cancel
    const originalCancel = replicationState.cancel.bind(replicationState);
    replicationState.cancel = async () => {
        await supabase.removeChannel(channel);
        return originalCancel();
    };

    // Listen to errors from the RxDB plugin itself
    replicationState.error$.subscribe(err => {
        console.error(`Replication error for ${tableName}:`, err);
        window.dispatchEvent(new CustomEvent('sync-error', { detail: { table: tableName, error: err } }));
    });

    // POLLING FALLBACK: Force resync every 30 seconds when online
    // This ensures updates are visible even if Realtime fails
    const pollInterval = setInterval(() => {
        if (navigator.onLine && !replicationState.isStopped()) {
            replicationState.reSync();
        }
    }, 30 * 1000); // 30 seconds

    // Clean up polling on cancel
    const finalCancel = replicationState.cancel.bind(replicationState);
    replicationState.cancel = async () => {
        clearInterval(pollInterval);
        return finalCancel();
    };

    return replicationState;
};
