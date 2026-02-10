import RecipeIngestor from "@/components/features/RecipeIngestor";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
      <main className="w-full max-w-4xl space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-serif font-bold text-zinc-900 tracking-tight">Chef to Cart</h1>
          <p className="text-xl text-muted-foreground font-light">The editorial meal planner.</p>
        </header>

        <section className="bg-white rounded-3xl shadow-xl p-8 border border-zinc-100">
          <RecipeIngestor />
        </section>
      </main>
    </div>
  );
}
