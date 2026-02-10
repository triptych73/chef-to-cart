import PlannerGrid from "@/components/features/PlannerGrid";

export default function PlannerPage() {
    return (
        <div className="min-h-screen bg-zinc-50 p-6 lg:p-12">
            <header className="mb-8">
                <h1 className="text-3xl font-serif font-bold text-zinc-900">Meal Planner</h1>
                <p className="text-muted-foreground">Drag and drop to plan your week.</p>
            </header>
            <PlannerGrid />
        </div>
    );
}
