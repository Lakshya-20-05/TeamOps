import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from '@radix-ui/react-label';
import { useAuth } from '../context/AuthContext';
import { Loader2, Wifi, Zap, Shield, ArrowRight, Layout } from 'lucide-react';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { login, signup, user, isLoading: isAuthLoading } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            let success = false;
            if (isLogin) {
                // Supabase uses email for login by default
                success = await login(email, password);
                if (success) {
                    navigate('/app');
                } else {
                    throw new Error('Authentication failed');
                }
            } else {
                success = await signup({ email, password, username, name });
                if (success) {
                    navigate('/app');
                } else {
                    // Signup success but no session -> Email verification needed
                    setError('Account created! Please check your email to confirm.');
                    // Switch to login mode automatically
                    setTimeout(() => setIsLogin(true), 2000);
                }
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            // Check for specific RxDB or validation errors
            if (err?.parameters?.errors) {
                // RxDB validation error
                const msg = err.parameters.errors[0]?.message || 'Validation error';
                setError(`Data Error: ${msg}`);
            } else if (err.message) {
                setError(err.message);
            } else {
                setError(isLogin ? 'Invalid credentials' : 'Failed to create account');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden selection:bg-primary/20">

            {/* Dynamic Background */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>
            </div>

            {/* Header */}
            <header className="px-6 h-20 flex items-center justify-between z-10">
                <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-lg shadow-primary/25">
                        <Layout className="w-5 h-5" />
                    </div>
                    <span>TeamOps</span>
                </div>
                <div className="flex items-center gap-4">
                    {user && (
                        <Button
                            onClick={() => navigate('/app')}
                            className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm"
                        >
                            Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    )}
                </div>
            </header>

            <main className="flex-1 relative z-10 flex flex-col justify-center">
                <div className="container mx-auto px-6 py-12 lg:py-20 grid lg:grid-cols-2 gap-16 items-center">

                    {/* Hero Content */}
                    {/* Hero Content */}
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-primary-foreground/80 text-sm font-medium backdrop-blur-md shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Offline-First Architecture
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
                            Sync your team <br />
                            <span className="text-gradient">at lightspeed.</span>
                        </h1>

                        <p className="text-xl text-muted-foreground/80 max-w-lg leading-relaxed">
                            The collaboration platform that works when the internet doesn't.
                            Zero loading spinners. 100% data ownership.
                        </p>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <FeatureBadge icon={<Zap size={16} />} text="Instant Sync" />
                            <FeatureBadge icon={<Shield size={16} />} text="E2E Encrypted" />
                            <FeatureBadge icon={<Wifi size={16} />} text="Offline Ready" />
                        </div>
                    </div>

                    {/* Auth Card with Glassmorphism */}
                    <div className="lg:pl-12 perspective-1000">
                        <Card className="w-full max-w-md mx-auto glass-panel border-0 text-card-foreground shadow-2xl relative overflow-hidden group">

                            {/* Hover Glow Effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

                            <div className="relative bg-card/95 backdrop-blur-xl p-1 rounded-xl h-full">
                                <CardHeader className="space-y-1 pb-4">
                                    <CardTitle className="text-3xl font-bold text-center">
                                        {user
                                            ? 'Resume Workspace'
                                            : (isLogin ? 'Welcome back' : 'Join the revolution')
                                        }
                                    </CardTitle>
                                    <CardDescription className="text-center text-muted-foreground/80">
                                        {user
                                            ? 'You are currently logged in'
                                            : (isLogin
                                                ? 'Enter your credentials to access interface'
                                                : 'Create your workspace in seconds'
                                            )
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {user ? (
                                        <div className="flex flex-col items-center justify-center space-y-6 py-8">
                                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary animate-pulse">
                                                {user.username?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-center space-y-2">
                                                <h3 className="text-2xl font-bold">Welcome back!</h3>
                                                <p className="text-muted-foreground">{user.name}</p>
                                            </div>
                                            <Button
                                                onClick={() => navigate('/app')}
                                                className="w-full max-w-xs h-12 text-lg font-semibold glow-button bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                                            >
                                                Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-5">
                                            {!isLogin && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="name">Full Name</Label>
                                                    <Input
                                                        id="name"
                                                        placeholder="John Doe"
                                                        value={name}
                                                        onChange={e => setName(e.target.value)}
                                                        required
                                                        className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
                                                    />
                                                </div>
                                            )}

                                            {!isLogin && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="username">Username</Label>
                                                    <Input
                                                        id="username"
                                                        placeholder="johnd"
                                                        value={username}
                                                        onChange={e => setUsername(e.target.value)}
                                                        required
                                                        className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="m@example.com"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    required
                                                    className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="password">Password</Label>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                    required
                                                    className="bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
                                                />
                                            </div>

                                            {error && (
                                                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
                                                    <Shield className="w-4 h-4" /> {error}
                                                </div>
                                            )}

                                            <Button className="w-full h-11 text-base font-semibold glow-button bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 border-0" type="submit" disabled={isLoading}>
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {isLogin ? 'Sign In' : 'Get Started'}
                                            </Button>

                                            <div className="text-center text-sm text-muted-foreground mt-4">
                                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                                <button
                                                    type="button"
                                                    className="font-bold text-primary hover:text-purple-400 transition-colors"
                                                    onClick={() => setIsLogin(!isLogin)}
                                                >
                                                    {isLogin ? 'Create Account' : 'Log in'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </CardContent>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

const FeatureBadge = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/20 border border-white/5 text-sm font-medium backdrop-blur-sm">
        <div className="text-primary">{icon}</div>
        <span>{text}</span>
    </div>
);

