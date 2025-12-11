import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import axios from 'axios';
import { CATEGORIES } from '../types';

// UPDATED: Points to client/public/assets/logo.png (User provided)
const LOGO_URL = '/assets/logo.png';

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
  // Virtual file fields for handling upload
  playerImageFiles: FileList;
  paymentScreenshotFiles?: FileList;
}

const API_BASE = '/api'; // Use relative path via Vite proxy

const Register: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [registeredPlayerId, setRegisteredPlayerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormInputs>({
    defaultValues: {
      category: '',
      playingStyle: 'UNKNOWN'
    },
    mode: 'onBlur'
  });

  const dob = watch('dob');
  const selectedCategory = watch('category');

  // Auto-calculate age
  useEffect(() => {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      // Update value and trigger validation
      setValue('age', age, { shouldValidate: true });
    }
  }, [dob, setValue]);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_BASE}/uploads`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  };

  const onStep1Submit = async () => {
    // 1. Validate Fields
    const isValid = await trigger(['name', 'mobile', 'email', 'dob', 'age', 'adhar', 'category', 'playerImageFiles']);
    
    if (!isValid) {
        setSubmitStatus('error');
        setSubmitMessage("Please fix the highlighted errors above.");
        // Scroll to top to see errors
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);
    setSubmitMessage('');
    setSubmitStatus('idle');

    try {
        const data = watch();
        // 2. Upload Player Image
        if (!data.playerImageFiles || data.playerImageFiles.length === 0) {
            throw new Error("Player image is required");
        }
        
        // Basic file size check (5MB)
        if (data.playerImageFiles[0].size > 5 * 1024 * 1024) {
            throw new Error("Image size too large. Max 5MB allowed.");
        }

        const playerImageUrl = await uploadFile(data.playerImageFiles[0]);
        setUploadProgress(40);

        // 3. Create Player Record
        const payload = {
            name: data.name,
            email: data.email,
            mobile: data.mobile,
            dob: data.dob,
            age: data.age,
            adhar: data.adhar,
            category: data.category,
            playerImageUrl,
            paymentStatus: false // Default to false initially
        };

        const res = await axios.post(`${API_BASE}/players`, payload);
        setRegisteredPlayerId(res.data._id);
        
        // 4. Move to step 2
        setStep(2);
        setUploadProgress(0);
        window.scrollTo(0,0);
    } catch (err: any) {
        console.error(err);
        setSubmitStatus('error');
        setSubmitMessage(err.response?.data?.error || err.message || "Failed to save details. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const onStep2Submit: SubmitHandler<FormInputs> = async (data, e) => {
    if (!registeredPlayerId) {
        setSubmitStatus('error');
        setSubmitMessage("Session lost. Please refresh and try again.");
        return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
        // 1. Upload Payment Screenshot (if exists)
        let paymentScreenshotUrl = '';
        if (data.paymentScreenshotFiles && data.paymentScreenshotFiles.length > 0) {
            // Check size (10MB)
             if (data.paymentScreenshotFiles[0].size > 10 * 1024 * 1024) {
                throw new Error("Screenshot too large. Max 10MB allowed.");
            }
            paymentScreenshotUrl = await uploadFile(data.paymentScreenshotFiles[0]);
        }
        setUploadProgress(60);

        // 2. Update Record
        const payload = {
            upiOrBarcode: data.upiOrBarcode,
            achievements: data.playerAchievement,
            playingStyle: data.playingStyle,
            remark: data.remark,
            paymentScreenshotUrl,
            paymentStatus: true // Always true when submitting the final step
        };

        await axios.patch(`${API_BASE}/players/${registeredPlayerId}/details`, payload);

        setUploadProgress(100);
        setSubmitStatus('success');
        setSubmitMessage("Registration complete! See you on the court.");
        window.scrollTo(0,0);

    } catch (err: any) {
        console.error(err);
        setSubmitStatus('error');
        setSubmitMessage(err.response?.data?.error || err.message || "Failed to complete registration.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center animate-fade-in bg-ublDark relative overflow-hidden">
        {/* Success Background */}
        <div 
            className="absolute inset-0 bg-cover bg-center z-0 opacity-40 mix-blend-overlay"
            style={{ backgroundImage: `url(${BG_URL})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-ublDark via-ublDark/90 to-blue-900/50"></div>
        
        <div className="z-10 flex flex-col items-center animate-bounce-in">
            <div className="w-32 h-32 mb-8 rounded-full bg-black/50 backdrop-blur border-4 border-ublCyan shadow-[0_0_50px_rgba(34,211,238,0.6)] flex items-center justify-center">
                <img src={LOGO_URL} alt="Logo" className="w-24 h-24 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,1)]" />
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-4 neon-text italic uppercase tracking-tighter">WELCOME TO UBL</h2>
            <p className="text-ublCyan font-bold text-xl mb-8 max-w-lg tracking-widest">{submitMessage}</p>
            <button onClick={() => window.location.reload()} className="px-12 py-5 bg-ublCyan text-black font-black uppercase tracking-widest rounded-full hover:bg-white hover:shadow-[0_0_50px_rgba(34,211,238,1)] hover:scale-105 transition duration-300">
            Register Another Player
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center items-start py-10 px-4 relative bg-ublDark selection:bg-ublCyan selection:text-black overflow-x-hidden">
      
      {/* --- CRAZY BACKGROUND START --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Base Image */}
        <div 
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${BG_URL})` }}
        ></div>
        {/* Color Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-ublDark/80 via-ublNavy/90 to-ublDark"></div>
        
        {/* Moving Grid Floor */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
                 backgroundImage: 'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)',
                 backgroundSize: '40px 40px',
                 transform: 'perspective(500px) rotateX(60deg) translateY(-100px) scale(2)',
                 animation: 'background-pan 20s linear infinite'
             }}>
        </div>

        {/* Floating Neon Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-ublCyan/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '4s' }}></div>
      </div>
      {/* --- CRAZY BACKGROUND END --- */}

      <div className="w-full max-w-5xl bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.2)] overflow-hidden relative z-10">
        
        <div className="relative">
            {/* Top accent bar */}
            <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-ublCyan to-blue-600 animate-pulse"></div>
            
            <div className="p-6 md:p-12">
            
            {/* Header Section */}
            <div className="flex flex-col items-center mb-10 text-center relative">
                {/* Huge Glowing Logo */}
                <div className="relative mb-6 group cursor-pointer">
                    <div className="absolute inset-0 bg-ublCyan/30 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>
                    <img 
                        src={LOGO_URL} 
                        alt="UBL Logo" 
                        className="w-40 h-40 md:w-56 md:h-56 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] transform group-hover:scale-110 transition-transform duration-500 ease-out" 
                    />
                </div>
                
                <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] mb-2">
                UNITED <span className="text-transparent bg-clip-text bg-gradient-to-r from-ublCyan to-white">BADMINTON</span> LEAGUE
                </h1>
                <p className="text-gray-400 uppercase tracking-[0.3em] text-sm md:text-base font-bold">Official Player Registration</p>
                
                {/* Stepper */}
                <div className="flex items-center space-x-4 mt-8 bg-black/40 px-6 py-2 rounded-full border border-white/5">
                    <div className={`flex items-center space-x-2 ${step === 1 ? 'text-ublCyan' : 'text-gray-500'}`}>
                        <span className="text-2xl font-black">01</span>
                        <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Player Details</span>
                    </div>
                    <div className="w-12 h-[1px] bg-gray-600"></div>
                    <div className={`flex items-center space-x-2 ${step === 2 ? 'text-ublCyan' : 'text-gray-500'}`}>
                        <span className="text-2xl font-black">02</span>
                        <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Payment & Confirm</span>
                    </div>
                </div>
            </div>

            <form onSubmit={step === 2 ? handleSubmit(onStep2Submit) : (e) => e.preventDefault()} className="space-y-10">
                
                {/* Error Banner */}
                {submitStatus === 'error' && (
                <div className="bg-red-500/10 border-l-4 border-red-500 text-red-200 p-4 rounded text-center animate-shake">
                    <span className="font-bold mr-2">ERROR:</span> {submitMessage}
                </div>
                )}

                {/* STEP 1: Personal Info */}
                {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Name */}
                    <div className="md:col-span-2 group">
                    <label className="block text-xs font-black text-ublCyan uppercase mb-2 tracking-widest pl-1">Full Name <span className="text-red-500">*</span></label>
                    <input 
                        {...register("name", { required: "Name is required", minLength: { value: 2, message: "Min 2 chars" } })}
                        className="w-full bg-slate-900/80 border border-gray-700 focus:border-ublCyan focus:bg-black focus:shadow-[0_0_20px_rgba(6,182,212,0.2)] rounded-xl px-6 py-5 text-white text-xl font-bold placeholder-gray-700 outline-none transition-all"
                        placeholder="ENTER PLAYER NAME"
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-2 font-bold ml-1">{errors.name.message}</p>}
                    </div>

                    {/* Mobile */}
                    <div>
                    <label className="block text-xs font-black text-ublCyan uppercase mb-2 tracking-widest pl-1">Mobile No. <span className="text-red-500">*</span></label>
                    <input 
                        type="tel"
                        {...register("mobile", { 
                            required: "Mobile is required", 
                            pattern: { value: /^[6-9]\d{9}$/, message: "Valid 10-digit number (starts 6-9)" } 
                        })}
                        className="w-full bg-slate-900/80 border border-gray-700 focus:border-ublCyan focus:bg-black rounded-xl px-6 py-4 text-white outline-none transition-all font-mono"
                        placeholder="9876543210"
                        maxLength={10}
                    />
                    {errors.mobile && <p className="text-red-400 text-xs mt-2 font-bold ml-1">{errors.mobile.message}</p>}
                    </div>

                    {/* Email */}
                    <div>
                    <label className="block text-xs font-black text-ublCyan uppercase mb-2 tracking-widest pl-1">Email</label>
                    <input 
                        type="email"
                        {...register("email", { 
                            pattern: { 
                                value: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/, 
                                message: "Invalid email format" 
                            } 
                        })}
                        className="w-full bg-slate-900/80 border border-gray-700 focus:border-ublCyan focus:bg-black rounded-xl px-6 py-4 text-white outline-none transition-all"
                        placeholder="PLAYER@EMAIL.COM"
                    />
                    {errors.email && <p className="text-red-400 text-xs mt-2 font-bold ml-1">{errors.email.message}</p>}
                    </div>

                    {/* DOB & Age Row */}
                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label className="block text-xs font-black text-ublCyan uppercase mb-2 tracking-widest pl-1">Date of Birth <span className="text-red-500">*</span></label>
                            <input 
                                type="date"
                                {...register("dob", { required: "Required" })}
                                className="w-full bg-slate-900/80 border border-gray-700 focus:border-ublCyan focus:bg-black rounded-xl px-6 py-4 text-white outline-none transition-all [color-scheme:dark]"
                            />
                            {errors.dob && <p className="text-red-400 text-xs mt-2 font-bold ml-1">{errors.dob.message}</p>}
                        </div>
                        <div className="w-28">
                            <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-widest text-center">Age</label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    readOnly
                                    {...register("age", { required: true, min: 1 })}
                                    className="w-full bg-black border-2 border-gray-800 text-ublCyan text-2xl font-black rounded-xl px-2 py-4 outline-none text-center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Adhar */}
                    <div>
                    <label className="block text-xs font-black text-ublCyan uppercase mb-2 tracking-widest pl-1">Adhar Number</label>
                    <input 
                        {...register("adhar", { 
                            validate: (value) => !value || /^\d{12}$/.test(value) || "Must be exactly 12 digits"
                        })}
                        className="w-full bg-slate-900/80 border border-gray-700 focus:border-ublCyan focus:bg-black rounded-xl px-6 py-4 text-white outline-none transition-all tracking-widest font-mono"
                        placeholder="XXXX XXXX XXXX"
                        maxLength={12}
                    />
                    {errors.adhar && <p className="text-red-400 text-xs mt-2 font-bold ml-1">{errors.adhar.message}</p>}
                    </div>

                    {/* Category Grid - Improved UI */}
                    <div className="md:col-span-2">
                    <label className="block text-xs font-black text-ublCyan uppercase mb-4 tracking-widest pl-1">Select Age Category <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {CATEGORIES.map(cat => (
                            <label 
                                key={cat} 
                                className={`
                                    relative cursor-pointer group overflow-hidden rounded-xl border-2 transition-all duration-300
                                    ${selectedCategory === cat 
                                        ? 'bg-ublCyan text-black border-ublCyan shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-105 z-10' 
                                        : 'bg-slate-900/50 border-gray-700 text-gray-400 hover:border-ublCyan hover:text-white hover:bg-black'
                                    }
                                `}
                            >
                                <input 
                                    type="radio" 
                                    value={cat}
                                    {...register("category", { required: "Please select a category" })}
                                    className="peer sr-only"
                                />
                                <div className="p-6 text-center flex flex-col items-center justify-center h-full">
                                    <span className="block text-3xl font-black italic tracking-tighter mb-1">
                                        {cat}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">YEARS</span>
                                </div>
                                {/* Shine effect */}
                                {selectedCategory === cat && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 skew-x-12 animate-shine pointer-events-none"></div>
                                )}
                            </label>
                        ))}
                    </div>
                    {errors.category && <p className="text-red-400 text-xs mt-2 font-bold text-center uppercase">{errors.category.message}</p>}
                    </div>

                    {/* Player Image */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-ublCyan uppercase mb-2 tracking-widest pl-1">Player Photo <span className="text-red-500">*</span></label>
                        <div className="relative border-2 border-dashed border-gray-600 rounded-2xl p-8 hover:border-ublCyan hover:bg-ublCyan/5 transition-all bg-black/40 group cursor-pointer flex flex-col items-center justify-center">
                            <input 
                                type="file" 
                                accept="image/png, image/jpeg, image/jpg"
                                {...register("playerImageFiles", { required: "Photo is required" })}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                            
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-gray-700 group-hover:border-ublCyan">
                                <svg className="h-10 w-10 text-ublCyan" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            
                            {watch("playerImageFiles")?.[0] ? (
                                <div className="text-center">
                                    <p className="text-ublCyan font-bold text-lg">Photo Selected!</p>
                                    <p className="text-sm text-gray-400 mt-1">{watch("playerImageFiles")[0].name}</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-sm font-bold text-white uppercase tracking-wider mb-1">Click to Upload</p>
                                    <p className="text-xs text-gray-500">JPG or PNG (Max 5MB)</p>
                                </div>
                            )}
                        </div>
                        {errors.playerImageFiles && <p className="text-red-400 text-xs mt-2 font-bold ml-1">{errors.playerImageFiles.message}</p>}
                    </div>

                </div>

                <div className="pt-8">
                    <button 
                        type="button"
                        onClick={onStep1Submit}
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-ublCyan to-blue-500 text-black font-black uppercase tracking-widest text-xl py-5 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.7)] hover:scale-[1.01] transform transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'PROCESSING...' : 'CONTINUE TO STEP 2'}
                    </button>
                </div>
                </div>
                )}

                {/* STEP 2: Payment & Stats */}
                {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
                
                {/* Playing Style */}
                <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5">
                    <label className="block text-xs font-black text-ublCyan uppercase mb-4 tracking-widest pl-1">Playing Style</label>
                    <div className="flex flex-wrap gap-4">
                        {['OFFENSIVE', 'DEFENSIVE', 'UNKNOWN'].map((style) => (
                            <label key={style} className="flex-1 min-w-[120px] cursor-pointer group">
                                <input 
                                    type="radio" 
                                    value={style}
                                    {...register("playingStyle")}
                                    className="peer sr-only"
                                />
                                <div className="bg-black/50 border border-gray-700 rounded-xl px-4 py-4 text-center transition-all peer-checked:bg-ublCyan peer-checked:text-black peer-checked:font-bold peer-checked:border-ublCyan hover:border-gray-500 h-full flex items-center justify-center">
                                    <span className="text-sm font-bold tracking-wider">{style}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                    {/* Achievements */}
                <div>
                    <label className="block text-xs font-black text-ublCyan uppercase mb-2 tracking-widest pl-1">Achievements</label>
                    <textarea 
                        {...register("playerAchievement")}
                        className="w-full bg-slate-900/80 border border-gray-700 focus:border-ublCyan focus:bg-black rounded-xl px-6 py-4 text-white outline-none h-32 text-lg"
                        placeholder="State level winner, 3x Local Champion, etc..."
                    />
                </div>

                    {/* Payment Section */}
                    <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-8 rounded-2xl border border-ublCyan/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-ublCyan/10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <h4 className="text-2xl font-black text-white uppercase italic mb-6 flex items-center">
                            <span className="bg-ublCyan text-black text-xs px-2 py-1 mr-3 rounded-md font-bold not-italic">REQ</span>
                            Payment Details
                        </h4>
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 bg-black/60 p-5 rounded-xl border border-white/10">
                            <span className="text-gray-400 text-sm mb-2 md:mb-0">OFFICIAL UPI ID:</span>
                            <span className="text-ublCyan font-mono font-bold text-2xl tracking-wider">ubl@upi</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Transaction Ref / Barcode No.</label>
                                <input 
                                    {...register("upiOrBarcode")}
                                    className="w-full bg-black/50 border border-gray-600 focus:border-ublCyan rounded-xl px-4 py-4 text-white outline-none"
                                    placeholder="e.g. UPI Ref Number"
                                />
                            </div>
                            
                            {/* Payment Screenshot */}
                            <div>
                                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Upload Screenshot</label>
                                <input 
                                    type="file" 
                                    accept="image/png, image/jpeg, image/jpg, application/pdf"
                                    {...register("paymentScreenshotFiles")}
                                    className="w-full text-sm text-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:bg-ublCyan file:text-black hover:file:bg-white transition-colors cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Remarks */}
                    <div>
                    <label className="block text-xs font-black text-ublCyan uppercase mb-2 tracking-widest pl-1">Remarks</label>
                    <input 
                        {...register("remark")}
                        className="w-full bg-slate-900/80 border border-gray-700 focus:border-ublCyan rounded-xl px-6 py-4 text-white outline-none"
                        placeholder="Any additional notes..."
                    />
                </div>

                {/* Actions */}
                    <div className="pt-4">
                        <button 
                            disabled={isSubmitting}
                            type="submit"
                            className="w-full bg-gradient-to-r from-ublCyan to-blue-500 text-black font-black uppercase tracking-widest text-lg py-5 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.7)] hover:-translate-y-1 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? `UPLOADING ${uploadProgress}%` : 'COMPLETE REGISTRATION'}
                        </button>
                    </div>
                </div>
                )}
                
                <p className="text-center text-[10px] text-gray-500 mt-6 uppercase tracking-widest">
                    By registering, you agree to the United Badminton League terms.
                </p>

            </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Register;