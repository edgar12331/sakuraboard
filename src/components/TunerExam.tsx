import { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, CheckCircle, Lock, AlertTriangle, ArrowRight, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'https://sakura-bot-fkih.onrender.com/api';

// --- QUESTION DEFINITIONS ---
type QuestionType = 'radio' | 'checkbox';

interface Option {
    text: string;
}

interface Question {
    id: string;
    section: string;
    text: string;
    type: QuestionType;
    points: number;
    options: Option[];
    image?: string;
}

const EXAM_QUESTIONS: Question[] = [
    {
        id: 'q1',
        section: 'Grundkompetenz',
        text: 'Welche Pflichten hast du während des Dienstes?',
        type: 'checkbox',
        points: 3,
        options: [
            { text: 'Funkpflicht' },
            { text: 'Tägliche Anwesenheitspflicht in der Werkstatt' },
            { text: 'Anwesenheit im TeamSpeak' },
            { text: 'Außendienst / Durchführung von Reparaturen' },
            { text: 'Abmeldung aus dem Dienst beim Verlassen des Dienstes' },
            { text: 'Tragen einer Waffe während des Dienstes' },
        ],
    },
    {
        id: 'q2',
        section: 'Grundkompetenz',
        text: 'Wie viel kostet eine Reparatur in der Werkstatt?',
        type: 'radio',
        points: 2,
        options: [
            { text: '5.000$' }, { text: 'Gratis' }, { text: '2.500$' },
            { text: '2.000$' }, { text: '1.000$' }, { text: '1.500$' },
        ],
    },
    {
        id: 'q3',
        section: 'Grundkompetenz',
        text: 'Wie wird der Preis bei normalen Kunden berechnet?',
        type: 'radio',
        points: 1,
        options: [
            { text: 'x1' }, { text: 'x2' }, { text: 'x3' }, { text: 'x4' }, { text: 'x5' },
            { text: 'x6' }, { text: 'x7' }, { text: 'x8' }, { text: 'x9' }, { text: 'x10' },
        ],
    },
    {
        id: 'q4',
        section: 'Grundkompetenz',
        text: 'Wie hoch sind die Wochenabgaben?',
        type: 'radio',
        points: 1,
        options: [
            { text: '200.000$' }, { text: '175.000$' }, { text: '170.000$' }, { text: '150.000$' },
            { text: '130.000$' }, { text: '100.000$' }, { text: '50.000$' }, { text: '25.000$' },
            { text: 'Es gibt keine wöchentliche Abgabe.' }
        ],
    },
    {
        id: 'q5',
        section: 'Grundkompetenz',
        text: 'Wie solltest du reagieren, wenn du von einem Kunden beleidigt oder bedroht wirst?',
        type: 'checkbox',
        points: 3,
        options: [
            { text: 'Den Kunden mit einer Waffe bedrohen und fesseln' },
            { text: 'Das LSPD verständigen' },
            { text: 'Den Kunden ignorieren' },
            { text: 'Ein Hausverbot aussprechen' },
            { text: 'Den Kunden anschreien' },
            { text: 'Ein Mitglied der Führungs- oder Leitungsebene hinzuziehen' },
        ],
    },
    {
        id: 'q6',
        section: 'Grundkompetenz',
        text: 'Wie lange darfst du ein Hausverbot aussprechen?',
        type: 'radio',
        points: 1,
        options: [
            { text: 'Permanent' }, { text: 'Einen Tag.' }, { text: 'Eine Woche' },
            { text: 'Einen Monat' }, { text: 'Drei Monate' }, { text: 'Ein Jahr' },
        ],
    },
    {
        id: 'q7',
        section: 'Grundkompetenz',
        text: 'Was musst du tun, bevor du die Werkstatt verlässt?',
        type: 'checkbox',
        points: 3,
        options: [
            { text: 'Den Dienst verlassen' },
            { text: 'Die Dienstkleidung ausziehen' },
            { text: 'Alle Dienstfahrzeuge ausparken' },
            { text: 'Alle Fahrzeuge reparieren, die sich bei der Werkstatt befinden' },
            { text: 'Über Funk mitteilen, dass man den Dienst verlässt' },
        ],
    },
    {
        id: 'q8',
        section: 'Grundkompetenz',
        text: 'Ab wann musst du dich im DC abmelden?',
        type: 'radio',
        points: 2,
        options: [
            { text: 'Ab 1 Tag' }, { text: 'Ab 2 Tagen' }, { text: 'Ab 3 Tagen' },
            { text: 'Ab 4 Tagen' }, { text: 'Ab 5 Tagen' }, { text: 'Ab einer Woche' }
        ],
    },
    {
        id: 'q9',
        section: 'Grundkompetenz',
        text: 'Für Aufstellungen: Wer darf Fraktionsfarben eintragen?',
        type: 'checkbox',
        points: 2,
        options: [
            { text: 'Alle' }, { text: 'Tuner' }, { text: 'Meister' },
            { text: 'Führungsebene' }, { text: 'Leitungsebene' }
        ],
    },
    {
        id: 'q10',
        section: 'Grundkompetenz',
        text: 'Was musst du tun, wenn du AFK gehen musst?',
        type: 'checkbox',
        points: 2,
        options: [
            { text: 'Mich mit „Hände hoch“ in der Hocke an die Wand stellen' },
            { text: 'Emoten (z. B. Buch lesen, Putzen)' },
            { text: 'In einen leeren Raum gehen' },
            { text: 'In den Relog gehen' },
            { text: 'Einfach stehen bleiben' },
            { text: 'Ins Fahrzeug setzen' }
        ],
    },
    {
        id: 'q11',
        section: 'Grundkompetenz',
        text: 'Darfst du in der Werkstatt parken?',
        type: 'radio',
        points: 1,
        options: [
            { text: 'Ja' }, { text: 'Nein' }, { text: 'Nur mit Erlaubnis der Führungs- und/oder Leitungsebene' }
        ],
    },
    {
        id: 'q12',
        section: 'Grundkompetenz',
        text: 'Darfst du bei Nagata tunen?',
        type: 'radio',
        points: 1,
        image: '/prüfung/bild1.png',
        options: [
            { text: 'Ja' }, { text: 'Ja, aber nur mit Genehmigung der Nagata-Leitungsebene' }, { text: 'Nein' }
        ],
    },
    {
        id: 'q13',
        section: 'Werkstatt',
        text: 'Welche Fahrzeuge dürfen im Parkhaus abgestellt werden?',
        type: 'checkbox',
        points: 1, // Assume 1 point for partial
        image: '/prüfung/bild2.png',
        options: [
            { text: 'Parkplatz für Dienstfahrzeuge' },
            { text: 'Kundenparkplatz' },
            { text: 'Parkplatz für den Abschlepper' },
            { text: 'Mitarbeiterparkplatz' },
            { text: 'Ort für abgeschleppte Fahrzeuge' },
            { text: 'Dieser Ort ist für nichts Bestimmtes vorgesehen' },
            { text: 'Parkverbot / Halteverbot' }
        ],
    },
    {
        id: 'q14',
        section: 'Werkstatt',
        text: 'Welche Fahrzeuge dürfen hier abgestellt werden?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild3.png',
        options: [
            { text: 'Dienstparkplatz (ausschließlich Dienstfahrzeuge)' },
            { text: 'Dienstparkplatz (Dienstfahrzeuge und Fahrzeuge der Leitungsebene)' },
            { text: 'Kundenparkplatz' },
            { text: 'Parkplatz für den Abschlepper' },
            { text: 'Mitarbeiterparkplatz' },
            { text: 'Ort für abgeschleppte Fahrzeuge' },
            { text: 'Dieser Ort ist für nichts Bestimmtes vorgesehen' },
            { text: 'Parkverbot / Halteverbot' }
        ],
    },
    {
        id: 'q15',
        section: 'Werkstatt',
        text: 'Welche Fahrzeuge dürfen hier abgestellt werden?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild4.png',
        options: [
            { text: 'Dienstparkplatz (ausschließlich Dienstfahrzeuge)' },
            { text: 'Dienstparkplatz (Dienstfahrzeuge und Fahrzeuge der Leitungsebene)' },
            { text: 'Kundenparkplatz' },
            { text: 'Parkplatz für den Abschlepper' },
            { text: 'Mitarbeiterparkplatz' },
            { text: 'Ort für abgeschleppte Fahrzeuge' },
            { text: 'Dieser Ort ist für nichts Bestimmtes vorgesehen' },
            { text: 'Parkverbot / Halteverbot' }
        ],
    },
    {
        id: 'q16',
        section: 'Werkstatt',
        text: 'Welche Fahrzeuge dürfen hier abgestellt werden?',
        type: 'checkbox',
        points: 2,
        image: '/prüfung/bild5.png',
        options: [
            { text: 'Dienstparkplatz (ausschließlich Dienstfahrzeuge)' },
            { text: 'Dienstparkplatz (Dienstfahrzeuge und Fahrzeuge der Leitungsebene)' },
            { text: 'Kundenparkplatz' },
            { text: 'Parkplatz für den Abschlepper' },
            { text: 'Mitarbeiterparkplatz' },
            { text: 'Ort für abgeschleppte Fahrzeuge' },
            { text: 'Dieser Ort ist für nichts Bestimmtes vorgesehen' },
            { text: 'Parkverbot / Halteverbot' },
            { text: 'Hier dürfen ausschließlich der Jester, der GTR und der NSX abgestellt werden' }
        ],
    },
    {
        id: 'q17',
        section: 'Einsatzorte',
        text: 'Welche Fahrzeuge werden hier getuned?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild6.png',
        options: [
            { text: 'Autos, Motorräder und Fahrräder' },
            { text: 'LKWs, Sattelschlepper und Busse' },
            { text: 'Helikopter' },
            { text: 'Flugzeuge' },
            { text: 'Boote, Uboote und Jetskis' },
            { text: 'Alles' }
        ],
    },
    {
        id: 'q18',
        section: 'Einsatzorte',
        text: 'Welche Fahrzeuge werden hier getuned?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild7.png',
        options: [
            { text: 'Autos, Motorräder und Fahrräder' },
            { text: 'LKWs, Sattelschlepper und Busse' },
            { text: 'Helikopter' },
            { text: 'Flugzeuge' },
            { text: 'Boote, Uboote und Jetskis' },
            { text: 'Alles' }
        ],
    },
    {
        id: 'q19',
        section: 'Einsatzorte',
        text: 'Welche Fahrzeuge werden hier getuned?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild8.png',
        options: [
            { text: 'Autos, Motorräder und Fahrräder' },
            { text: 'LKWs, Sattelschlepper und Busse' },
            { text: 'Helikopter' },
            { text: 'Flugzeuge' },
            { text: 'Boote, Uboote und Jetskis' },
            { text: 'Alles' }
        ],
    },
    {
        id: 'q20',
        section: 'Einsatzorte',
        text: 'Welche Fahrzeuge werden hier getuned?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild9.png',
        options: [
            { text: 'Autos, Motorräder und Fahrräder' },
            { text: 'LKWs, Sattelschlepper und Busse' },
            { text: 'Helikopter' },
            { text: 'Flugzeuge' },
            { text: 'Boote, Uboote und Jetskis' },
            { text: 'Alles' }
        ],
    },
    {
        id: 'q21',
        section: 'Einsatzorte',
        text: 'Welche Fahrzeuge werden hier getuned?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild10.png',
        options: [
            { text: 'Autos, Motorräder und Fahrräder' },
            { text: 'LKWs, Sattelschlepper und Busse' },
            { text: 'Helikopter' },
            { text: 'Flugzeuge' },
            { text: 'Boote, Uboote und Jetskis' },
            { text: 'Alles' }
        ],
    },
    {
        id: 'q22',
        section: 'Kleidungsvorschriften',
        text: 'Wann darfst du Schwarz tragen?',
        type: 'checkbox',
        points: 2,
        image: '/prüfung/bild11.png',
        options: [
            { text: 'Als Zivilist' }, { text: 'Als Mitarbeiter' },
            { text: 'Als Führungsebene' }, { text: 'Als Leitungsebene' }
        ],
    },
    {
        id: 'q23',
        section: 'Kleidungsvorschriften',
        text: 'Wann darfst du Weiß tragen?',
        type: 'checkbox', // User form logic isn't fully clear here, checkbox allows multiple which is safer
        points: 1,
        image: '/prüfung/bild12.png',
        options: [
            { text: 'Als Zivilist' }, { text: 'Als Mitarbeiter' },
            { text: 'Als Führungsebene' }, { text: 'Als Leitungsebene' }
        ],
    },
    {
        id: 'q24',
        section: 'Kleidungsvorschriften',
        text: 'Wann musst du keine Dienstkleidung tragen?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild13.png',
        options: [
            { text: 'Im Dienst' }, { text: 'Im Außendienst' }, { text: 'Als Zivilist' },
            { text: 'Als Mitarbeiter' }, { text: 'Als Führungsebene' }, { text: 'Als Leitungsebene' }
        ],
    }
];

interface TunerExamProps {
    logout: () => void;
}

export function TunerExam({ logout }: TunerExamProps) {
    const [status, setStatus] = useState<'loading' | 'locked' | 'unlocked' | 'submitted'>('loading');
    const [score, setScore] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const [ausbilderName, setAusbilderName] = useState('');
    const [charName, setCharName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await axios.get(`${API_URL}/tuner-exam/status`);
                setStatus(res.data.status);
                if (res.data.score !== undefined) {
                    setScore(res.data.score);
                }
            } catch (err) {
                console.error('Failed to fetch tuner exam status', err);
                setErrorMsg('Fehler beim Laden des Prüfungsstatus.');
                setStatus('locked');
            }
        };

        fetchStatus();

        // If locked, poll every 10 seconds to see if unlocked
        let interval: any;
        if (status === 'locked') {
            interval = setInterval(fetchStatus, 10000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status]);

    const handleAnswerChange = (qId: string, value: string, type: QuestionType, checked: boolean) => {
        setAnswers(prev => {
            const current = prev[qId] || [];
            if (type === 'radio') {
                return { ...prev, [qId]: [value] };
            } else {
                if (checked) {
                    return { ...prev, [qId]: [...current, value] };
                } else {
                    return { ...prev, [qId]: current.filter(v => v !== value) };
                }
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!ausbilderName.trim() || !charName.trim()) {
            setErrorMsg('Bitte fülle deinen Namen und den des Ausbilders aus.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            await axios.post(`${API_URL}/tuner-exam/submit`, {
                answers,
                ausbilder: ausbilderName,
                score: 0 // Will be calculated by admin manually, or you can implement an auto-grader here
            });
            setStatus('submitted');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Submit error:', err);
            setErrorMsg('Fehler beim Einreichen. Bitte versuche es erneut.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex flex-col h-screen w-full items-center justify-center bg-zinc-950 text-white z-10 relative">
                <div className="sakura-spin text-sakura-400 mb-4 h-12 w-12 border-4 border-sakura-400 border-t-transparent rounded-full animate-spin"></div>
                <p>Status wird geladen...</p>
            </div>
        );
    }

    if (status === 'locked') {
        return (
            <div className="flex flex-col h-screen w-full items-center justify-center bg-zinc-950 text-white z-10 relative p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center shadow-2xl"
                >
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={32} className="text-sakura-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Prüfung gesperrt</h1>
                    <p className="text-zinc-400 mb-8 leading-relaxed">
                        Deine Zugriffsanfrage wurde registriert. Bitte warte, bis ein Ausbilder oder Administrator deine Prüfung freischaltet.
                        <br /><br />
                        Diese Seite aktualisiert sich automatisch, sobald du freigeschaltet wurdest.
                    </p>
                    <button className="btn btn-secondary w-full justify-center" onClick={logout}>
                        <LogOut size={16} className="mr-2" /> Abmelden
                    </button>
                </motion.div>
            </div>
        );
    }

    if (status === 'submitted') {
        return (
            <div className="flex flex-col h-screen w-full items-center justify-center bg-zinc-950 text-white z-10 relative p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md w-full bg-zinc-900 border border-sakura-500/30 rounded-xl p-8 text-center shadow-2xl"
                >
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={32} className="text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-4 text-emerald-400">Prüfung abgegeben!</h1>
                    <p className="text-zinc-400 mb-8 leading-relaxed">
                        Herzlichen Glückwunsch, du hast die Tunerprüfung erfolgreich eingereicht!
                        Deine Antworten werden nun von den Ausbildern überprüft.
                    </p>
                    <button className="btn btn-secondary w-full justify-center" onClick={logout}>
                        <LogOut size={16} className="mr-2" /> Abmelden
                    </button>
                </motion.div>
            </div>
        );
    }

    // --- UNLOCKED: RENDER EXAM FORM ---
    // Group questions by section
    const sections = Array.from(new Set(EXAM_QUESTIONS.map(q => q.section)));

    return (
        <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 z-10 relative overflow-y-auto overflow-x-hidden">
            <div className="max-w-4xl w-full mx-auto p-4 md:p-8">

                {/* Header Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 md:p-10 mb-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sakura-400 via-rose-400 to-sakura-400"></div>
                    <h1 className="text-4xl font-black tracking-tight mb-4 text-white">Tunerprüfung</h1>
                    <p className="text-lg text-zinc-300 leading-relaxed mb-6">
                        Herzlich willkommen und herzlichen Glückwunsch, dass Sie es bis hierhin geschafft haben.
                        <br /><br />
                        Dieser Test dient der Überprüfung deiner allgemeinen Kompetenzen und soll dem Ausbilder eine fundierte Einschätzung ermöglichen, ob du für die Tätigkeit als Tuner geeignet bist.
                        <br /><br />
                        Um den Test erfolgreich zu bestehen, müssen mindestens <strong className="text-sakura-300">34 von 38 Punkten</strong> erreicht werden.
                    </p>

                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-start mb-6">
                            <AlertTriangle className="mr-3 shrink-0 mt-0.5" size={18} />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 p-6 bg-black/20 rounded-lg border border-white/5">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Ihr Name (IC) <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                value={charName}
                                onChange={e => setCharName(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sakura-500 focus:ring-1 focus:ring-sakura-500 transition-colors"
                                placeholder="Geben Sie Ihren Namen ein"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Name des Ausbilders (IC) <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                value={ausbilderName}
                                onChange={e => setAusbilderName(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sakura-500 focus:ring-1 focus:ring-sakura-500 transition-colors"
                                placeholder="Name des Prüfers"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Form Sections */}
                <form onSubmit={handleSubmit}>
                    {sections.map((section, sIdx) => (
                        <div key={section} className="mb-12">
                            <h2 className="text-2xl font-bold mb-6 flex items-center text-zinc-100 border-b border-zinc-800 pb-4">
                                <span className="bg-sakura-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 shadow-lg">{sIdx + 1}</span>
                                {section}
                            </h2>

                            {section === 'Grundkompetenz' && (
                                <p className="text-zinc-400 mb-6 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                                    <span className="font-semibold text-blue-300">Wichtig:</span> Bei einigen Fragen können mehrere Antwortmöglichkeiten korrekt sein.
                                </p>
                            )}

                            <div className="space-y-8">
                                {EXAM_QUESTIONS.filter(q => q.section === section).map((q, qIdx) => (
                                    <motion.div
                                        key={q.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6 shadow-md hover:border-zinc-700 transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-medium text-white pr-4 leading-snug">
                                                {q.text} <span className="text-red-400">*</span>
                                            </h3>
                                            <span className="shrink-0 text-xs font-semibold bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full whitespace-nowrap">
                                                {q.points} {q.points === 1 ? 'Punkt' : 'Punkte'}
                                            </span>
                                        </div>

                                        {q.image && (
                                            <div className="mb-6 rounded-lg overflow-hidden border border-zinc-800 max-w-2xl bg-zinc-950">
                                                <img src={q.image} alt="Fragenbild" className="w-full object-contain max-h-96" />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 gap-3">
                                            {q.options.map((opt, oIdx) => {
                                                const isRadio = q.type === 'radio';
                                                const isChecked = (answers[q.id] || []).includes(opt.text);

                                                return (
                                                    <label
                                                        key={oIdx}
                                                        className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all duration-200 ${isChecked
                                                                ? 'bg-sakura-500/10 border-sakura-500/50'
                                                                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                                                            }`}
                                                    >
                                                        <div className="flex items-center h-5 mt-0.5">
                                                            <input
                                                                type={isRadio ? "radio" : "checkbox"}
                                                                name={q.id}
                                                                checked={isChecked}
                                                                onChange={(e) => handleAnswerChange(q.id, opt.text, q.type, e.target.checked)}
                                                                className={`
                                                                    appearance-none w-5 h-5 border-2 rounded-sm border-zinc-600 bg-zinc-900 
                                                                    checked:bg-sakura-500 checked:border-sakura-500 transition-all cursor-pointer
                                                                    relative
                                                                    ${isRadio ? 'rounded-full' : ''}
                                                                `}
                                                            />
                                                        </div>
                                                        <div className="ml-3 text-sm text-zinc-300 select-none">
                                                            {opt.text}
                                                        </div>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-6 rounded-xl mt-12 shadow-2xl sticky bottom-4 z-50">
                        <button
                            type="button"
                            className="text-zinc-400 hover:text-white transition-colors"
                            onClick={logout}
                        >
                            Abbrechen & Abmelden
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`btn btn-primary px-8 py-3 rounded-lg font-bold flex items-center shadow-lg shadow-sakura-500/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                                    Einreichen...
                                </>
                            ) : (
                                <>
                                    <Save size={18} className="mr-2" />
                                    Prüfung Abgeben
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
