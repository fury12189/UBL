import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import axios from 'axios';
import { CATEGORIES } from '../types';

// Asset Paths
const LOGO_URL = '/assets/logo.png';
const QR_URL = '/assets/qr.jpg';
const OFFICIAL_UPI = 'boim-900781510442@boi';

// Background: High energy stadium/badminton feel
const BG_URL = 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069&auto=format&fit=crop';

interface FormInputs {
  name: string;
  email: string;
  mobile: string;
  dob: string;
  age: number;
  adhar: string;
  category: string;
  upiOrBarcode: string;
  playerAchievement: string;
  playingStyle: 'OFFENSIVE' | 'DEFENSIVE' | 'UNKNOWN';
  remark: string;
  playerImageFiles: FileList;
  validDocumentFiles: FileList;
  paymentScreenshotFiles?: FileList;
}

const API_BASE = '/api';

const Register: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [registeredPlayerId, setRegisteredPlayerId] = useState<string | null>(null);
  const [uploadedPlayerImage, setUploadedPlayerImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormInputs>({
    defaultValues: {
      category: '',
      playingStyle: 'UNKNOWN',
      adhar: ''
    },
    mode: 'onBlur'
  });

  const dob = watch('dob');
  const selectedCategory = watch('category');

  // Auto-calculate age from DOB
  useEffect(() => {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setValue('age', age, { shouldValidate: true });
    }
  }, [dob, setValue]);

  const copyUpi = () => {
    navigator.clipboard.writeText(OFFICIAL_UPI);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_BASE}/uploads`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  };

  const onStep1Submit = async () => {
    // Validate Step 1 fields
    const isValid = await trigger(['name', 'mobile', 'email', 'dob', 'age', 'adhar', 'category', 'playerImageFiles', 'validDocumentFiles']);
    
    if (!isValid) {
        setSubmitStatus('error');
        setSubmitMessage("Please check the form for errors.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);
    setSubmitMessage('');
    setSubmitStatus('idle');

    try {
        const data = watch();
        if (!data.playerImageFiles?.[0] || !data.validDocumentFiles?.[0]) {
            throw new Error("Identity Proof and Photo are required.");
        }

        const [playerImageUrl, validDocumentUrl] = await Promise.all([
            uploadFile(data.playerImageFiles[0]),
            uploadFile(data.validDocumentFiles[0])
        ]);

        setUploadedPlayerImage(playerImageUrl);
        setUploadProgress(50);

        const payload = {
            name: data.name,
            email: data.email,
            mobile: data.mobile,
            dob: data.dob,
            age: data.age,
            adhar: data.adhar,
            category: data.category,
            playerImageUrl,
            validDocumentUrl,
            paymentStatus: false
        };

        const res = await axios.post(`${API_BASE}/players`, payload);
        setRegisteredPlayerId(res.data._id);
        setStep(2);
        setUploadProgress(0);
        window.scrollTo(0,0);
    } catch (err: any) {
        setSubmitStatus('error');
        setSubmitMessage(err.response?.data?.error || err.message || "Failed to save details.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const onStep2Submit: SubmitHandler<FormInputs> = async (data) => {
    if (!registeredPlayerId) return;
    setIsSubmitting(true);
    setUploadProgress(10);

    try {
        if (!data.paymentScreenshotFiles?.[0]) {
            throw new Error("Payment screenshot is required.");
        }
        
        const paymentScreenshotUrl = await uploadFile(data.paymentScreenshotFiles[0]);
        setUploadProgress(60);

        const payload = {
            upiOrBarcode: data.upiOrBarcode,
            achievements: data.playerAchievement,
            playingStyle: data.playingStyle,
            remark: data.remark,
            paymentScreenshotUrl,
            paymentStatus: true
        };

        await axios.patch(`${API_BASE}/players/${registeredPlayerId}/details`, payload);

        setUploadProgress(100);
        setSubmitStatus('success');
        setSubmitMessage("Registration successful! Welcome to the United Badminton League.");
        window.scrollTo(0,0);
    } catch (err: any) {
        setSubmitStatus('error');
        setSubmitMessage(err.response?.data?.error || err.message || "Final step failed.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-ublDark relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${BG_URL})` }}></div>
        <div className="z-10 animate-in zoom-in duration-500 flex flex-col items-center w-full max-w-3xl">
            <img src={LOGO_URL} alt="Logo" className="w-24 h-24 mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,1)]" />
            <h2 className="text-4xl md:text-5xl font-black text-white mb-2 italic tracking-tighter uppercase">SUCCESSFULLY REGISTERED</h2>
            <p className="text-ublCyan font-bold text-lg md:text-xl mb-8 tracking-widest">{submitMessage}</p>

            <div className="bg-black/60 backdrop-blur-md p-8 rounded-3xl border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)] mb-10 w-full">
                <h3 className="text-yellow-400 font-black text-xl uppercase italic mb-6 text-center tracking-wider border-b border-yellow-500/20 pb-4">
                    Player Benefits & Roadmap
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <ul className="space-y-4 flex-1 text-left">
                        {[
                            "PLAYER GOES IN TO LIVE AUCTION",
                            "TRAINING CAMP UNDER FRANCHISE",
                            "PROVIDE PLAYER KIT",
                            "DURING MATCHES PLAYERS GET MAN OF MATCH",
                            "DURING & AFTER MATCH PROVIDES SNACKS OR DINNER"
                        ].map((point, i) => (
                            <li key={i} className="flex items-start text-gray-200 font-bold uppercase text-sm md:text-base tracking-wide">
                                <span className="text-yellow-400 mr-3 text-xl">•</span>
                                {point}
                            </li>
                        ))}
                    </ul>
                    
                    {uploadedPlayerImage && (
                        <div className="flex flex-col items-center shrink-0">
                             <div className="relative group w-32 h-32 md:w-40 md:h-40">
                                <div className="absolute -inset-1 bg-gradient-to-r from-ublCyan to-blue-600 rounded-full blur opacity-75 animate-pulse-slow"></div>
                                <img 
                                    src={uploadedPlayerImage} 
                                    alt="Player" 
                                    className="relative w-full h-full object-cover rounded-full border-4 border-black shadow-2xl"
                                />
                            </div>
                            <span className="mt-3 text-xs font-black text-ublCyan uppercase tracking-widest">Player Card</span>
                        </div>
                    )}
                </div>
            </div>

            <button onClick={() => window.location.reload()} className="px-12 py-5 bg-ublCyan text-black font-black uppercase tracking-widest rounded-full hover:bg-white hover:shadow-[0_0_40px_rgba(34,211,238,1)] transition-all">
                Register New Player
            </button>
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-ublDark relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay" style={{ backgroundImage: `url(${BG_URL})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-ublDark via-transparent to-transparent"></div>
            
            <div className="z-10 animate-in slide-in-from-bottom-10 duration-1000 flex flex-col items-center max-w-4xl">
                <img src={LOGO_URL} alt="Logo" className="w-56 h-56 md:w-72 md:h-72 object-contain mb-8 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)] animate-pulse-slow" />
                <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter text-white leading-none mb-6">
                    UNITED <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-ublCyan to-blue-500">BADMINTON</span> <br/> LEAGUE
                </h1>
                <p className="text-gray-400 text-xl font-bold uppercase tracking-[0.3em] mb-12">Season 2024 Registration Open</p>
                <button 
                    onClick={() => setShowWelcome(false)} 
                    className="group relative px-20 py-8 bg-ublCyan text-black font-black uppercase text-2xl tracking-widest rounded-full hover:bg-white hover:shadow-[0_0_60px_rgba(34,211,238,1)] transition-all duration-300 transform hover:scale-105"
                >
                    Start Registration
                    <div className="absolute inset-0 rounded-full border-4 border-ublCyan group-hover:scale-125 group-hover:opacity-0 transition-all duration-500"></div>
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center py-12 px-4 relative bg-ublDark">
      <div className="fixed inset-0 z-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${BG_URL})` }}></div>
      
      <div className="w-full max-w-4xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative z-10 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-ublCyan to-blue-600"></div>
        <div className="p-8 md:p-12">
            
            <div className="flex flex-col items-center mb-10">
                <img src={LOGO_URL} alt="Logo" className="w-20 h-20 mb-4 cursor-pointer" onClick={() => setShowWelcome(true)} />
                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase text-center">
                    {step === 1 ? 'Player Details' : 'Payment & Stats'}
                </h2>
                <div className="flex space-x-4 mt-6">
                    <div className={`h-1.5 w-16 rounded-full transition-all duration-500 ${step === 1 ? 'bg-ublCyan shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-gray-700'}`}></div>
                    <div className={`h-1.5 w-16 rounded-full transition-all duration-500 ${step === 2 ? 'bg-ublCyan shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-gray-700'}`}></div>
                </div>
            </div>

            <form onSubmit={step === 2 ? handleSubmit(onStep2Submit) : (e) => e.preventDefault()} className="space-y-8">
                {submitStatus === 'error' && (
                    <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-red-200 font-bold text-center animate-shake">
                        {submitMessage}
                    </div>
                )}

                {step === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="md:col-span-2">
                            <label className="text-ublCyan text-xs font-black uppercase mb-2 block tracking-widest">Full Name *</label>
                            <input {...register("name", { required: "Full Name is required" })} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-4 text-white focus:border-ublCyan outline-none transition-all" placeholder="ENTER PLAYER FULL NAME" />
                            {errors.name && <p className="text-red-400 text-[10px] mt-1 font-bold">{errors.name.message}</p>}
                        </div>
                        
                        <div>
                            <label className="text-ublCyan text-xs font-black uppercase mb-2 block tracking-widest">Mobile Number *</label>
                            <input type="tel" {...register("mobile", { required: "Mobile number is required", pattern: { value: /^[6-9]\d{9}$/, message: "Valid 10-digit number required" } })} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-4 text-white outline-none focus:border-ublCyan transition-all" placeholder="10-DIGIT MOBILE" maxLength={10} />
                            {errors.mobile && <p className="text-red-400 text-[10px] mt-1 font-bold">{errors.mobile.message}</p>}
                        </div>

                        <div>
                            <label className="text-ublCyan text-xs font-black uppercase mb-2 block tracking-widest">Email (Optional)</label>
                            <input type="email" {...register("email")} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-4 text-white outline-none focus:border-ublCyan transition-all" placeholder="EMAIL@EXAMPLE.COM" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-ublCyan text-xs font-black uppercase mb-2 block tracking-widest">Date of Birth *</label>
                                <input type="date" {...register("dob", { required: "DOB is required" })} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-4 text-white outline-none focus:border-ublCyan transition-all [color-scheme:dark]" />
                            </div>
                            <div className="relative">
                                <label className="text-ublCyan text-xs font-black uppercase mb-2 block tracking-widest">Calculated Age</label>
                                <input type="number" {...register("age")} readOnly className="w-full bg-black/60 border border-gray-800 rounded-xl px-4 py-4 text-ublCyan font-black text-xl outline-none" placeholder="0" />
                                <div className="absolute right-4 bottom-4 text-[10px] font-bold text-gray-600 uppercase">Yrs</div>
                            </div>
                        </div>

                        <div>
                            <label className="text-ublCyan text-xs font-black uppercase mb-2 block tracking-widest">Aadhar Number (Optional)</label>
                            <input {...register("adhar", { pattern: { value: /^\d{12}$/, message: "Must be 12 numeric digits" } })} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-4 text-white outline-none focus:border-ublCyan transition-all font-mono tracking-widest" placeholder="12-DIGIT AADHAR" maxLength={12} />
                            {errors.adhar && <p className="text-red-400 text-[10px] mt-1 font-bold">{errors.adhar.message}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-ublCyan text-xs font-black uppercase mb-2 block tracking-widest">League Category *</label>
                            <select {...register("category", { required: "Please select a category" })} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-4 text-white outline-none focus:border-ublCyan transition-all">
                                <option value="">SELECT AGE GROUP</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {errors.category && <p className="text-red-400 text-[10px] mt-1 font-bold">{errors.category.message}</p>}
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 bg-black/30 border border-gray-800 rounded-2xl group hover:border-ublCyan transition-colors">
                                <label className="text-ublCyan text-xs font-black uppercase mb-3 block tracking-widest">Identity Proof Doc *</label>
                                <input type="file" {...register("validDocumentFiles", { required: "Required" })} className="text-xs text-gray-500 file:bg-slate-800 file:text-white file:border-0 file:py-2 file:px-4 file:rounded-full file:cursor-pointer hover:file:bg-ublCyan hover:file:text-black transition-all" />
                                <p className="text-[10px] text-gray-500 mt-2 italic font-medium">Aadhar/Passport/DL (PDF or Image)</p>
                                {errors.validDocumentFiles && <p className="text-red-400 text-[10px] mt-1 font-bold">Document is mandatory</p>}
                            </div>
                            <div className="p-5 bg-black/30 border border-gray-800 rounded-2xl group hover:border-ublCyan transition-colors">
                                <label className="text-ublCyan text-xs font-black uppercase mb-3 block tracking-widest">Passport Size Photo *</label>
                                <input type="file" {...register("playerImageFiles", { required: "Required" })} className="text-xs text-gray-500 file:bg-slate-800 file:text-white file:border-0 file:py-2 file:px-4 file:rounded-full file:cursor-pointer hover:file:bg-ublCyan hover:file:text-black transition-all" />
                                <p className="text-[10px] text-gray-500 mt-2 italic font-medium">Clear portrait for player profile</p>
                                {errors.playerImageFiles && <p className="text-red-400 text-[10px] mt-1 font-bold">Photo is mandatory</p>}
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-6">
                            <button onClick={onStep1Submit} disabled={isSubmitting} className="w-full bg-ublCyan text-black font-black uppercase tracking-widest py-5 rounded-xl hover:bg-white hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all transform active:scale-95 text-lg">
                                {isSubmitting ? 'PROCESSING...' : 'CONTINUE TO PAYMENT'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-ublCyan text-xs font-black uppercase mb-2 block tracking-widest">Playing Style</label>
                                <select {...register("playingStyle")} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-4 text-white outline-none focus:border-ublCyan">
                                    <option value="UNKNOWN">UNKNOWN</option>
                                    <option value="OFFENSIVE">OFFENSIVE</option>
                                    <option value="DEFENSIVE">DEFENSIVE</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-ublCyan text-xs font-black uppercase mb-2 block tracking-widest">Key Achievements</label>
                                <input {...register("playerAchievement")} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-4 text-white outline-none focus:border-ublCyan" placeholder="E.G. DISTRICT CHAMPION" />
                            </div>
                        </div>

                        {/* Payment Card */}
                        <div className="bg-slate-800/40 p-8 rounded-3xl border border-ublCyan/20 shadow-xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-ublCyan/5 blur-3xl pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-white font-black italic uppercase text-xl flex items-center">
                                    <span className="w-2 h-6 bg-ublCyan mr-3 rounded-full"></span>
                                    Scan to Pay
                                </h3>
                                <span className="bg-ublCyan/10 text-ublCyan px-3 py-1 rounded-full text-[10px] font-black uppercase border border-ublCyan/20">Official UBL Portal</span>
                            </div>
                            
                            <div className="flex flex-col lg:flex-row items-center gap-10">
                                <div className="bg-white p-4 rounded-2xl shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                                    <img src={QR_URL} alt="Payment QR" className="w-44 h-44 object-contain" />
                                </div>
                                
                                <div className="flex-1 w-full space-y-6">
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 relative group">
                                        <div className="absolute top-0 right-0 p-2">
                                            <button 
                                                type="button" 
                                                onClick={copyUpi}
                                                className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${copied ? 'bg-green-500 text-white' : 'bg-ublCyan text-black hover:bg-white'}`}
                                            >
                                                {copied ? 'COPIED!' : 'COPY ID'}
                                            </button>
                                        </div>
                                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-widest">OFFICIAL UPI ID</p>
                                        <p className="text-ublCyan font-mono text-xl md:text-2xl font-black tracking-widest truncate pr-16">{OFFICIAL_UPI}</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="text-gray-400 text-[10px] font-black uppercase mb-2 block tracking-widest">Transaction ID / Ref *</label>
                                            <input {...register("upiOrBarcode", { required: "Transaction ID is mandatory", pattern: { value: /^[A-Za-z0-9]{8,20}$/, message: "Enter a valid 8-20 character ID" } })} className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-4 text-white outline-none focus:border-ublCyan text-lg font-mono tracking-widest uppercase" placeholder="ENTER REF NUMBER" maxLength={20} />
                                            {errors.upiOrBarcode && <p className="text-red-400 text-[10px] mt-1 font-bold">{errors.upiOrBarcode.message}</p>}
                                        </div>
                                        <div>
                                            <label className="text-gray-400 text-[10px] font-black uppercase mb-2 block tracking-widest">Payment Screenshot *</label>
                                            <input type="file" {...register("paymentScreenshotFiles", { required: "Screenshot is mandatory" })} className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-ublCyan file:text-black hover:file:bg-white transition-all cursor-pointer" />
                                            {errors.paymentScreenshotFiles && <p className="text-red-400 text-[10px] mt-1 font-bold">Screenshot is required</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-ublCyan to-blue-600 text-black font-black uppercase tracking-widest py-6 rounded-2xl hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] transition-all transform active:scale-95 text-xl">
                            {isSubmitting ? `UPLOADING ${uploadProgress}%` : 'SUBMIT REGISTRATION'}
                        </button>
                    </div>
                )}
            </form>
        </div>
      </div>
    </div>
  );
};

export default Register;