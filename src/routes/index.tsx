import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, BookOpenCheck, GraduationCap, PlayCircle, ShieldCheck } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campus Grove — Lectures, materials & grades in one place" },
      {
        name: "description",
        content:
          "Teachers upload lecture videos, materials and grades. Students register for semester courses and track their progress.",
      },
      { property: "og:title", content: "Campus Grove — Learning platform for teachers & students" },
      {
        property: "og:description",
        content: "Lecture videos, course registration, grades and performance dashboards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: PlayCircle, title: "Lecture videos & files", text: "Teachers upload videos, slides and documents per course." },
  { icon: BookOpenCheck, title: "Semester registration", text: "Students pick their courses for the semester in a few clicks." },
  { icon: BarChart3, title: "Performance dashboards", text: "Grades, progress and class insights for every role." },
  { icon: ShieldCheck, title: "Separate access", text: "Teachers and students sign in to their own spaces." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <GraduationCap className="h-6 w-6 text-accent" /> Campus Grove
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="ghost"><Link to="/auth" search={{ as: "teacher" }}>Teacher sign in</Link></Button>
          <Button asChild><Link to="/auth" search={{ as: "student" }}>Student sign in</Link></Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-8 md:grid-cols-2">
        <div>
          <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Fall semester registration is open
          </span>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] text-primary md:text-6xl">
            Where lectures, grades and growth live together.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Teachers share lecture videos and materials. Students register for courses, learn at their pace, and see how they're doing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="hero"><Link to="/auth" search={{ as: "student", mode: "signup" }}>I'm a student</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth" search={{ as: "teacher", mode: "signup" }}>I'm a teacher</Link></Button>
          </div>
        </div>
        <div className="relative">
          <img src={hero} alt="Student watching a lecture in a sunny library" width={1600} height={1104} className="rounded-3xl object-cover shadow-soft" />
          <div className="absolute -bottom-6 -left-6 hidden rounded-2xl bg-card p-4 shadow-soft md:block">
            <p className="text-xs text-muted-foreground">Average progress</p>
            <p className="font-display text-3xl font-bold text-primary">87%</p>
          </div>
        </div>
      </section>

      <section className="bg-hero py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-sidebar-accent p-6 text-sidebar-foreground">
              <f.icon className="h-7 w-7 text-sidebar-primary" />
              <h3 className="mt-4 text-lg font-bold text-sidebar-accent-foreground">{f.title}</h3>
              <p className="mt-2 text-sm">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} Campus Grove</footer>
    </div>
  );
}
