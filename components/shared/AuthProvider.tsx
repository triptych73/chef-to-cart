"use client";

import { useEffect, useState, createContext, useContext } from "react";
import {
    signInAnonymously,
    onAuthStateChanged,
    User,
    signOut as firebaseSignOut
} from "firebase/auth";
import { auth } from "@/lib/firebase";

const AuthContext = createContext<{
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}>({
    user: null,
    loading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                console.log("No user found, signing in anonymously for shared access...");
                signInAnonymously(auth).catch((error) => {
                    console.error("Anonymous sign-in failed:", error);
                });
            } else {
                console.log("Shared session active:", currentUser.uid);
                setUser(currentUser);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
