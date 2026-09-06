import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { Clipboard, Save, MessageSquare, Loader2, Link, Pencil, QrCode } from 'lucide-react';

// ====================================================================
// 🚨 DEPLOYMENT CONFIGURATION (REQUIRED STEP)
// 🚨 REPLACE THIS PLACEHOLDER OBJECT with your actual Firebase config.
// You must get this from your Firebase console after creating a new project.
// ====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyC1-ZWhRAhOh4JzzmLpqxnHPEXmcRgRDms",
    authDomain: "binpaste-8fd73.firebaseapp.com",
    projectId: "binpaste-8fd73",
    storageBucket: "binpaste-8fd73.firebasestorage.app",
    messagingSenderId: "14978874051",
    appId: "1:14978874051:web:a7dbba61595e0a6c2e8076",
    measurementId: "G-5Z3JWTGDQS"
  };

