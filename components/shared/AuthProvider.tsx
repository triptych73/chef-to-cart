"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const AuthContext = createContext<{ user: User | null; loading: boolean }>({
    user: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                console.log("No user found, signing in anonymously...");
                try {
                    const cred = await signInAnonymously(auth);
                    console.log("Signed in anonymously with UID:", cred.user.uid);
                } catch (error) {
                    console.error("Anonymous sign-in failed:", error);
                }
            } else {
                console.log("User session active:", currentUser.uid);
                setUser(currentUser);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
