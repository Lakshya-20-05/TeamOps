import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Label } from '@radix-ui/react-label';

export const SignUpPage: React.FC = () => {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            const success = await signup({
                name: formData.name,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                username: formData.username,
                password: formData.password
            });

            if (success) {
                navigate('/');
            } else {
                setError("Username already exists");
            }
        } catch (err) {
            setError("An error occurred during sign up");
            console.error(err);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Create Account</CardTitle>
                    <CardDescription className="text-center">
                        Enter your details to get started
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" required placeholder="John Doe" value={formData.name} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" required placeholder="john@example.com" value={formData.email} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input id="phoneNumber" required placeholder="+1 234 567 8900" value={formData.phoneNumber} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" required placeholder="johndoe" value={formData.username} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" required value={formData.password} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input id="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} />
                        </div>
                        {error && <p className="text-sm text-destructive text-center">{error}</p>}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button type="submit" className="w-full">Sign Up</Button>
                        <p className="text-sm text-center text-muted-foreground">
                            Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};
