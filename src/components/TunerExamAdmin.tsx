import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Unlock, Eye, Trash2, CheckCircle, Lock, AlertCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const API_URL = import.meta.env.VITE_API_URL || 'https://sakura-bot-fkih.onrender.com/api';

interface ExamRecord {
    user_id: string;
    username: string;
    avatar: string;
    ausbilder: string;
    status: 'locked' | 'unlocked' | 'submitted';
    score: number;
    answers: any;
    created_at: string;
    updated_at: string;
}

export function TunerExamAdmin() {
    const [exams, setExams] = useState<ExamRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewExam, setViewExam] = useState<ExamRecord | null>(null);

    const fetchExams = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.get(`${API_URL}/admin/tuner-exams`);
            setExams(res.data);
        } catch (err) {
            console.error('Failed to load exams', err);
            setError('Fehler beim Laden der Prüfungsdaten.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    const handleUnlock = async (id: string, name: string) => {
        if (!confirm(`Möchtest du die Prüfung für ${name} freischalten?`)) return;
        try {
            await axios.post(`${API_URL}/admin/tuner-exams/${id}/unlock`);
            fetchExams();
        } catch (err) {
            alert('Fehler beim Freischalten.');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Soll der Prüfungsdatensatz von ${name} wirklich gelöscht werden? Dies kann nicht rückgängig gemacht werden.`)) return;
        try {
            await axios.delete(`${API_URL}/admin/tuner-exams/${id}`);
            if (viewExam?.user_id === id) setViewExam(null);
            fetchExams();
        } catch (err) {
            alert('Fehler beim Löschen.');
        }
    };

    if (viewExam) {
        return (
            <div className="admin-section">
                <div className="section-header flex justify-between items-center mb-6">
                    <div>
                        <h2 className="section-title flex items-center gap-2">
                            Zurücksetzen & Auswertung: {viewExam.username}
                        </h2>
                        <p className="text-sm text-zinc-400">Ausbilder: {viewExam.ausbilder || 'Unbekannt'} | Eingereicht am: {format(new Date(viewExam.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setViewExam(null)}>
                        <X size={16} className="mr-2" /> Schließen
                    </button>
                </div>

                <div className="surface p-6 mb-6">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-2">Gegebene Antworten</h3>
                    {viewExam.answers && Object.keys(viewExam.answers).length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(viewExam.answers).map(([qId, ansArray]) => (
                                <div key={qId} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                                    <div className="text-xs text-sakura-400 font-mono mb-1">Frage {qId.replace('q', '')}</div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(ansArray as string[]).map((ans, i) => (
                                            <span key={i} className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-md text-sm border border-zinc-700">
                                                {ans}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-zinc-500 italic">Keine Antworten gespeichert oder leere Abgabe.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-section">
            <div className="section-header flex justify-between items-center mb-6">
                <div>
                    <h2 className="section-title">Tunerprüfung Verwaltung</h2>
                    <p className="text-xs text-zinc-400 mt-1">Hier siehst du alle Anfragen und eingereichten Prüfungen.</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={fetchExams} disabled={isLoading}>
                    <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Aktualisieren
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-center mb-6 text-sm">
                    <AlertCircle size={16} className="mr-2" /> {error}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300 border-collapse">
                    <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/50 border-b border-zinc-800">
                        <tr>
                            <th className="px-4 py-3 font-medium">Benutzer</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Letztes Update</th>
                            <th className="px-4 py-3 font-medium text-right">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {exams.length === 0 && !isLoading ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                                    Keine Prüfungsdatensätze gefunden.
                                </td>
                            </tr>
                        ) : (
                            exams.map((exam) => (
                                <tr key={exam.user_id} className="border-b border-zinc-800/50 bg-zinc-950/30 hover:bg-zinc-900/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {exam.avatar ? (
                                                <img src={`https://cdn.discordapp.com/avatars/${exam.user_id}/${exam.avatar}.png`} className="w-8 h-8 rounded-full bg-zinc-800" alt="" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                                    {exam.username.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-zinc-200">{exam.username}</div>
                                                <div className="text-xs text-zinc-500 font-mono">{exam.user_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {exam.status === 'locked' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                                <Lock size={12} /> Gesperrt
                                            </span>
                                        )}
                                        {exam.status === 'unlocked' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                <Unlock size={12} /> Schreibt...
                                            </span>
                                        )}
                                        {exam.status === 'submitted' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                <CheckCircle size={12} /> Abgegeben
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                                        {format(new Date(exam.updated_at), 'dd.MM.yy HH:mm')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            {exam.status === 'locked' && (
                                                <button
                                                    onClick={() => handleUnlock(exam.user_id, exam.username)}
                                                    className="btn btn-primary btn-sm px-3"
                                                    title="Prüfung freischalten"
                                                >
                                                    <Unlock size={14} className="mr-1.5" /> Freischalten
                                                </button>
                                            )}
                                            {exam.status === 'submitted' && (
                                                <button
                                                    onClick={() => setViewExam(exam)}
                                                    className="btn btn-secondary btn-sm px-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                                    title="Antworten ansehen"
                                                >
                                                    <Eye size={14} className="mr-1.5" /> Auswerten
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(exam.user_id, exam.username)}
                                                className="btn btn-danger btn-icon btn-sm opacity-50 hover:opacity-100"
                                                title="Datensatz löschen (Zurücksetzen)"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
