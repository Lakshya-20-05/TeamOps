import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Label } from '@radix-ui/react-label';

export const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const success = await login(username, password);
            if (success) {
                navigate('/');
            }
        } catch (err: any) {
            console.error(err);
            // Normalized error message check
            const errMsg = (err.message || JSON.stringify(err) || '').toLowerCase();
            if (!navigator.onLine || errMsg.includes('fetch') || errMsg.includes('network')) {
                setError("Offline login failed. Invalid credentials or no cached session.");
            } else {
                setError(err.message || "An error occurred during login");
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
                    <CardDescription className="text-center">
                        Enter your credentials to access your workspace
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {/* Debug/Status Badge */}
                        {localStorage.getItem('offline_creds') && (
                            <div className="bg-green-500/10 text-green-500 text-xs px-2 py-1 rounded-md mb-2 text-center border border-green-500/20">
                                ✓ Offline Access Ready
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                required
                                placeholder="johndoe"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-destructive text-center">{error}</p>}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button type="submit" className="w-full">Log In</Button>
                        <p className="text-sm text-center text-muted-foreground">
                            Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};
