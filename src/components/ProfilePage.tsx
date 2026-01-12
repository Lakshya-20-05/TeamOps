import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

import { User } from 'lucide-react';

export const ProfilePage: React.FC = () => {
    const { user } = useAuth();

    if (!user) return <div>Please log in</div>;

    return (
        <div className="flex justify-center mt-10">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                        <User size={48} />
                    </div>
                    <CardTitle className="text-2xl">{user.name}</CardTitle>
                    <CardDescription>@{user.username}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm mt-4">
                        <div className="font-semibold text-muted-foreground">Email</div>
                        <div className="col-span-2">{user.email}</div>



                        <div className="font-semibold text-muted-foreground">User ID</div>
                        <div className="col-span-2 font-mono text-xs text-muted-foreground">{user.id}</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
