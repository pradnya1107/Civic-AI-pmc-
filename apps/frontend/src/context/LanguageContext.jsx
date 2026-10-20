import React, { createContext, useContext, useState, useEffect } from 'react';

const LANGUAGE_STORAGE_KEY = 'civicai_portal_lang';

const translations = {
  en: {
    // Brand & General
    brandName: 'CivicAI PMC',
    portalSubtitle: 'Citizen Portal',
    tagline: 'Your City, Your Voice.',
    smartCityBadge: 'Smart City Pune',
    welcomeBack: 'Welcome back',
    welcome: 'Welcome',

    // Nav & Sidebar
    navOverview: 'Overview',
    navReportIssue: 'Report an Issue',
    navMyComplaints: 'My Complaints',
    navExploreMap: 'Explore Map',
    navNotifications: 'Notifications',
    navHelpSupport: 'Help & Support',
    navProfile: 'Profile',
    navSignOut: 'Sign Out',
    signOutLabel: 'Sign out of Citizen Portal',

    // Search & Actions
    searchPlaceholder: 'Search complaints by ID, title, or location...',
    trackInputPlaceholder: 'Enter Grievance ID (e.g. CIV-2026-001)...',
    trackStatusBtn: 'Track Status',
    reportNewIssueBtn: 'Report New Issue',

    // Voice
    voiceGreetingTitle: 'Voice Welcome',
    voiceGreetingPlaying: 'Playing Greeting...',
    voiceGreetingText: 'Welcome to CivicAI. Your city, your voice.',

    // Stats
    statTotal: 'Total Complaints',
    statPending: 'Pending Review',
    statInProgress: 'In Progress',
    statResolved: 'Resolved & Verified',
    statCommunity: 'Community Support',

    // Quick Actions
    quickActionsTitle: 'Quick Actions',
    quickReportTitle: 'Report Civic Issue',
    quickReportDesc: 'Take a photo with instant AI detection',
    quickTrackTitle: 'Track a Complaint',
    quickTrackDesc: 'Check live status and SLA deadline',
    quickMapTitle: 'Explore Nearby Issues',
    quickMapDesc: 'View live PMC heatmap and upvote',
    quickNotifTitle: 'View Notifications',
    quickNotifDesc: 'Check status updates from officers',

    // Recent Complaints
    recentComplaintsTitle: 'Recent Grievances',
    viewAllComplaints: 'View All Complaints',
    filterAll: 'All',
    filterPending: 'Pending',
    filterInProgress: 'In Progress',
    filterResolved: 'Resolved',
    sortByNewest: 'Newest First',
    sortByOldest: 'Oldest First',
    sortByPriority: 'Highest Priority',
    colId: 'Grievance ID',
    colCategory: 'Category',
    colLocation: 'Location',
    colDate: 'Submitted',
    colStatus: 'Status',
    colAction: 'Action',
    viewDetails: 'View Details',
    noComplaintsFound: 'No grievances found',
    noComplaintsDesc: 'You have not submitted any complaints in this category yet. Help improve Pune by reporting issues in your neighborhood.',

    // Map
    mapTitle: 'Nearby Civic Issues Map',
    mapSubtitle: 'Interactive view of reported potholes, garbage, and infrastructure issues in your area',
    mapFilterCategory: 'Filter Category',
    mapFilterStatus: 'Filter Status',
    mapAllCategories: 'All Categories',
    mapAllStatuses: 'All Statuses',

    // Activity
    activityTitle: 'Recent Activity & Notifications',
    markAllRead: 'Mark All Read',
    noNotifications: 'No new notifications',

    // Help
    helpTitle: 'Pune Municipal Corporation Help Center',
    helplineText: 'PMC 24x7 Citizen Helpline: 1800-1030-222',
    whatsappHelpline: 'WhatsApp Grievance: +91 96899 00002',

    // Location
    currentArea: 'Current Area',
    locationDetecting: 'Detecting location...',
    locationPuneDefault: 'Pune Municipal Corporation',
  },
  mr: {
    // Brand & General
    brandName: 'सिव्हिक एआय पुणे',
    portalSubtitle: 'नागरिक पोर्टल',
    tagline: 'आपले शहर, आपला आवाज.',
    smartCityBadge: 'स्मार्ट सिटी पुणे',
    welcomeBack: 'पुन्हा स्वागत आहे',
    welcome: 'स्वागत आहे',

    // Nav & Sidebar
    navOverview: 'मुख्यपृष्ठ',
    navReportIssue: 'तक्रार नोंदवा',
    navMyComplaints: 'माझ्या तक्रारी',
    navExploreMap: 'नकाशा पहा',
    navNotifications: 'सूचना',
    navHelpSupport: 'मदत व सहाय्य',
    navProfile: 'माझी माहिती',
    navSignOut: 'बाहेर पडा',
    signOutLabel: 'नागरिक पोर्टलवरून बाहेर पडा',

    // Search & Actions
    searchPlaceholder: 'तक्रार आयडी किंवा ठिकाणाने शोधा...',
    trackInputPlaceholder: 'तक्रार आयडी प्रविष्ट करा...',
    trackStatusBtn: 'स्थिती तपासा',
    reportNewIssueBtn: 'नवीन तक्रार नोंदवा',

    // Voice
    voiceGreetingTitle: 'आवाज स्वागत',
    voiceGreetingPlaying: 'स्वागत ऐकवत आहे...',
    voiceGreetingText: 'सिव्हिक एआय मध्ये आपले स्वागत आहे. आपले शहर, आपला आवाज.',

    // Stats
    statTotal: 'एकूण तक्रारी',
    statPending: 'प्रलंबित तक्रारी',
    statInProgress: 'प्रगतीपथावर',
    statResolved: 'निवारण झालेल्या',
    statCommunity: 'नागरिक पाठबळ',

    // Quick Actions
    quickActionsTitle: 'जलद कृती',
    quickReportTitle: 'तक्रार नोंदवा',
    quickReportDesc: 'एआय फोटो स्कॅनरने त्वरित नोंदणी',
    quickTrackTitle: 'तक्रार ट्रॅक करा',
    quickTrackDesc: 'थेट स्थिती आणि एसएलए मर्यादा तपासा',
    quickMapTitle: 'परिसरातील समस्या',
    quickMapDesc: 'थेट मनपा नकाशा पहा आणि समर्थन द्या',
    quickNotifTitle: 'सूचना पहा',
    quickNotifDesc: 'अधिकाऱ्यांचे थेट अपडेट्स तपासा',

    // Recent Complaints
    recentComplaintsTitle: 'नुकत्याच नोंदवलेल्या तक्रारी',
    viewAllComplaints: 'सर्व तक्रारी पहा',
    filterAll: 'सर्व',
    filterPending: 'प्रलंबित',
    filterInProgress: 'प्रगतीपथावर',
    filterResolved: 'निवारण झालेल्या',
    sortByNewest: 'नवीनतम आधी',
    sortByOldest: 'जुने आधी',
    sortByPriority: 'उच्च प्राधान्य',
    colId: 'तक्रार आयडी',
    colCategory: 'वर्गवारी',
    colLocation: 'ठिकाण',
    colDate: 'तारीख',
    colStatus: 'स्थिती',
    colAction: 'कृती',
    viewDetails: 'तपशील पहा',
    noComplaintsFound: 'कोणतीही तक्रार आढळली नाही',
    noComplaintsDesc: 'आपण अद्याप कोणतीही तक्रार नोंदवलेली नाही. आपल्या परिसरातील समस्या नोंदवून पुणे शहर सुधारण्यास मदत करा.',

    // Map
    mapTitle: 'परिसरातील नागरी समस्यांचा नकाशा',
    mapSubtitle: 'खड्डे, कचरा आणि पथदिव्यांच्या समस्यांचा परस्परसंवादी नकाशा',
    mapFilterCategory: 'वर्गवारी निवडा',
    mapFilterStatus: 'स्थिती निवडा',
    mapAllCategories: 'सर्व वर्गवारी',
    mapAllStatuses: 'सर्व स्थिती',

    // Activity
    activityTitle: 'सूचना आणि घडामोडी',
    markAllRead: 'सर्व वाचले म्हणून नोंदवा',
    noNotifications: 'कोणतीही नवीन सूचना नाही',

    // Help
    helpTitle: 'पुणे महानगरपालिका मदत केंद्र',
    helplineText: 'मनपा २४x७ नागरिक हेल्पलाइन: १८००-१०३०-२२२',
    whatsappHelpline: 'व्हॉट्सअ‍ॅप तक्रार क्रमांक: +९१ ९६८९९ ००००२',

    // Location
    currentArea: 'सध्याचे क्षेत्र',
    locationDetecting: 'ठिकाण शोधत आहे...',
    locationPuneDefault: 'पुणे महानगरपालिका',
  },
  hi: {
    // Brand & General
    brandName: 'सिविक एआई पुणे',
    portalSubtitle: 'नागरिक पोर्टल',
    tagline: 'आपका शहर, आपकी आवाज़।',
    smartCityBadge: 'स्मार्ट सिटी पुणे',
    welcomeBack: 'वापसी पर स्वागत है',
    welcome: 'स्वागत है',

    // Nav & Sidebar
    navOverview: 'अवलोकन',
    navReportIssue: 'शिकायत दर्ज करें',
    navMyComplaints: 'मेरी शिकायतें',
    navExploreMap: 'मानचित्र देखें',
    navNotifications: 'सूचनाएं',
    navHelpSupport: 'सहायता केंद्र',
    navProfile: 'प्रोफ़ाइल',
    navSignOut: 'लॉग आउट',
    signOutLabel: 'नागरिक पोर्टल से लॉग आउट करें',

    // Search & Actions
    searchPlaceholder: 'शिकायत आईडी या स्थान से खोजें...',
    trackInputPlaceholder: 'शिकायत आईडी दर्ज करें...',
    trackStatusBtn: 'स्थिति जांचें',
    reportNewIssueBtn: 'नई शिकायत दर्ज करें',

    // Voice
    voiceGreetingTitle: 'ध्वनि स्वागत',
    voiceGreetingPlaying: 'स्वागत सुनाया जा रहा है...',
    voiceGreetingText: 'सिविक एआई में आपका स्वागत है। आपका शहर, आपकी आवाज़।',

    // Stats
    statTotal: 'कुल शिकायतें',
    statPending: 'लंबित शिकायतें',
    statInProgress: 'प्रगति पर',
    statResolved: 'समाधान किया गया',
    statCommunity: 'नागरिक समर्थन',

    // Quick Actions
    quickActionsTitle: 'त्वरित कार्रवाई',
    quickReportTitle: 'समस्या दर्ज करें',
    quickReportDesc: 'एआई फोटो स्कैनर से तुरंत रिपोर्ट करें',
    quickTrackTitle: 'शिकायत ट्रैक करें',
    quickTrackDesc: 'लाइव स्थिति और समय सीमा देखें',
    quickMapTitle: 'आस-पास की समस्याएं',
    quickMapDesc: 'लाइव हीटमैप देखें और समर्थन दें',
    quickNotifTitle: 'सूचनाएं देखें',
    quickNotifDesc: 'अधिकारियों से अपडेट जांचें',

    // Recent Complaints
    recentComplaintsTitle: 'हाल की शिकायतें',
    viewAllComplaints: 'सभी शिकायतें देखें',
    filterAll: 'सभी',
    filterPending: 'लंबित',
    filterInProgress: 'प्रगति पर',
    filterResolved: 'हल किया गया',
    sortByNewest: 'नवीनतम पहले',
    sortByOldest: 'पुराने पहले',
    sortByPriority: 'उच्च प्राथमिकता',
    colId: 'शिकायत आईडी',
    colCategory: 'श्रेणी',
    colLocation: 'स्थान',
    colDate: 'तारीख',
    colStatus: 'स्थिति',
    colAction: 'कार्रवाई',
    viewDetails: 'विवरण देखें',
    noComplaintsFound: 'कोई शिकायत नहीं मिली',
    noComplaintsDesc: 'आपने अभी तक इस श्रेणी में कोई शिकायत दर्ज नहीं की है। पुणे को बेहतर बनाने में मदद करें।',

    // Map
    mapTitle: 'आस-पास की नागरिक समस्याओं का नक्शा',
    mapSubtitle: 'गड्ढे, कचरा और स्ट्रीटलाइट समस्याओं का इंटरएक्टिव नक्शा',
    mapFilterCategory: 'श्रेणी चुनें',
    mapFilterStatus: 'स्थिति चुनें',
    mapAllCategories: 'सभी श्रेणियां',
    mapAllStatuses: 'सभी स्थितियां',

    // Activity
    activityTitle: 'हाल की गतिविधियां व सूचनाएं',
    markAllRead: 'सभी पढ़ा हुआ चिह्नित करें',
    noNotifications: 'कोई नई सूचना नहीं',

    // Help
    helpTitle: 'पुणे नगर निगम सहायता केंद्र',
    helplineText: 'पीएमसी २४x७ नागरिक हेल्पलाइन: १८००-१०३०-२२२',
    whatsappHelpline: 'व्हाट्सएप शिकायत नंबर: +९१ ९६८९९ ००००२',

    // Location
    currentArea: 'वर्तमान क्षेत्र',
    locationDetecting: 'स्थान खोजा जा रहा है...',
    locationPuneDefault: 'पुणे नगर निगम',
  },
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback = '') => translations.en?.[key] || fallback || key,
  languages: [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  ],
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && translations[stored]) {
        return stored;
      }
    } catch {
      // Ignore
    }
    return 'en';
  });

  const setLanguage = (newLang) => {
    if (translations[newLang]) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      } catch {
        // Ignore
      }
    }
  };

  const t = (key, fallback = '') => {
    return translations[language]?.[key] || translations.en?.[key] || fallback || key;
  };

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  ];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
