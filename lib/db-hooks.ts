import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    doc,
    setDoc,
    serverTimestamp
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Recipe, MealPlan } from "@/types";
import { useAuth } from "@/components/shared/AuthProvider";

export function useRecipes(includeGlobal: boolean = false) {
    const { user } = useAuth();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        console.log(`📡 Firestore: Subscription active for recipes (Global: true)`);

        // Fetch all recipes for shared family access
        const q = query(collection(db, "recipes"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const recipeData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Recipe[];
            console.log(`Fetched ${recipeData.length} recipes for UID: ${user.uid}`);
            setRecipes(recipeData);
            setLoading(false);
        }, (err) => {
            console.error("Firestore Recipes Error:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid, includeGlobal]);

    const addRecipe = async (recipe: Partial<Recipe>) => {
        if (!user) throw new Error("Not authenticated");
        console.log("💾 Persistence: Creating new recipe...", recipe.title);
        const docRef = await addDoc(collection(db, "recipes"), {
            ...recipe,
            ownerId: user.uid, // Keep for audit/author tracking
            createdAt: serverTimestamp()
        });
        console.log("✅ Persistence: Recipe created with ID:", docRef.id);
        return docRef;
    };

    const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
        if (!user) throw new Error("Not authenticated");
        console.log("💾 Persistence: Updating recipe...", id);
        const docRef = doc(db, "recipes", id);
        await setDoc(docRef, updates, { merge: true });
        console.log("✅ Persistence: Update complete");
    };

    const deleteRecipe = async (id: string) => {
        if (!user) throw new Error("Not authenticated");
        console.log("💾 Persistence: Deleting recipe...", id);
        const docRef = doc(db, "recipes", id);
        // We'll actually implement delete here later if needed, but for now just the hook
    };

    return { recipes, loading, addRecipe, updateRecipe, deleteRecipe, user };
}

export function useMealPlan(weekStartDate: string) {
    const { user } = useAuth();
    const [plan, setPlan] = useState<MealPlan | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const planId = `family_shared_${weekStartDate}`;
        const docRef = doc(db, "meal_plans", planId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setPlan(docSnap.data() as MealPlan);
            } else {
                setPlan(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Firestore MealPlan Error:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid, weekStartDate]);

    const updatePlan = async (days: MealPlan["days"]) => {
        if (!user) throw new Error("Not authenticated");

        const planId = `family_shared_${weekStartDate}`;
        const docRef = doc(db, "meal_plans", planId);

        return setDoc(docRef, {
            familyId: "shared",
            weekStartDate,
            days,
            updatedAt: serverTimestamp()
        }, { merge: true });
    };

    return { plan, loading, updatePlan };
}
