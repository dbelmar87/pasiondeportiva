"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

interface Candidate {
  id: string;
  athlete_name: string;
  sport: string;
  achievement: string;
  votes: number;
  avatar_url?: string;
}

interface PollMeta {
  question: string;
  subtitle: string;
  poll_version: number;
}

export default function WeeklyPoll() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [meta, setMeta] = useState<PollMeta>({
    question: "¿Quién fue el mejor chileno de la semana?",
    subtitle: "Elige al deportista nacional más destacado en el extranjero.",
    poll_version: 1,
  });
  const [votedId, setVotedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchPollData() {
      const [{ data: settingsData }, { data: votesData }] = await Promise.all([
        supabase.from("poll_settings").select("*").eq("id", "active").maybeSingle(),
        supabase.from("weekly_votes").select("*").order("votes", { ascending: false }),
      ]);

      const currentVersion = settingsData?.poll_version ?? 1;
      if (settingsData) {
        setMeta({
          question: settingsData.question,
          subtitle: settingsData.subtitle,
          poll_version: currentVersion,
        });
      }

      const savedVote = localStorage.getItem(`pd_weekly_vote_v${currentVersion}`);
      if (savedVote) setVotedId(savedVote);

      if (votesData) setCandidates(votesData);
      setLoading(false);
    }

    fetchPollData();
  }, []);

  const handleVote = async (candidate: Candidate) => {
    if (votedId) return;

    const supabase = createClient();
    const newVotes = candidate.votes + 1;
    setVotedId(candidate.id);
    localStorage.setItem(`pd_weekly_vote_v${meta.poll_version}`, candidate.id);

    setCandidates((prev) =>
      prev
        .map((c) => (c.id === candidate.id ? { ...c, votes: newVotes } : c))
        .sort((a, b) => b.votes - a.votes)
    );

    await supabase
      .from("weekly_votes")
      .update({ votes: newVotes })
      .eq("id", candidate.id);
  };

  const totalVotes = candidates.reduce((acc, item) => acc + item.votes, 0);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 p-6" />;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-600">
          Votación en vivo
        </span>
        <span className="text-xs font-medium text-slate-500">
          {totalVotes} votos
        </span>
      </div>

      <h3 className="mb-1 text-xl font-bold text-slate-900">{meta.question}</h3>
      <p className="mb-5 text-sm text-slate-600">{meta.subtitle}</p>

      <div className="space-y-3">
        {candidates.map((candidate) => {
          const percentage =
            totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0;
          const isSelected = votedId === candidate.id;
          const initials = candidate.athlete_name
            .split(" ")
            .map((n) => n)
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <button
              key={candidate.id}
              onClick={() => handleVote(candidate)}
              disabled={Boolean(votedId)}
              className={`relative w-full overflow-hidden rounded-xl border p-3 text-left transition ${
                isSelected
                  ? "border-red-500 bg-red-50/30"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {votedId && (
                <div
                  className="absolute inset-y-0 left-0 bg-slate-100 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Foto del deportista o iniciales */}
                  {candidate.avatar_url ? (
                    <img
                      src={candidate.avatar_url}
                      alt={candidate.athlete_name}
                      className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover bg-slate-100"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-700">
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold text-slate-900">
                        {candidate.athlete_name}
                      </span>
                      <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                        {candidate.sport}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {candidate.achievement}
                    </p>
                  </div>
                </div>

                {votedId && (
                  <span className="shrink-0 text-sm font-bold text-slate-900">
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {votedId && (
        <p className="mt-4 text-center text-xs font-medium text-emerald-600">
          ¡Gracias por votar! Tu elección ya está registrada.
        </p>
      )}
    </div>
  );
}
