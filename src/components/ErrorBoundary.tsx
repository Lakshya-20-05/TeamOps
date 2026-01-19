import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-background text-foreground min-h-screen flex flex-col items-center justify-center">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
                    <div className="bg-muted p-4 rounded-md overflow-x-auto max-w-4xl w-full">
                        <p className="font-mono text-sm text-red-500 mb-2">{this.state.error?.toString()}</p>
                        <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </div>
                    <button
                        className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
