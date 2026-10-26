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
    navSettings: 'Settings',
    portalSettings: 'Account Settings & Security',
    resetPassword: 'Reset Password',
    navSignOut: 'Sign Out',
    signOutLabel: 'Sign out of Citizen Portal',
    myProfileAndPreferences: 'My Profile & Preferences',
    helpCenterAndHelplines: 'Help Center & Helplines',
    mainServices: 'MAIN SERVICES',
    selectLanguage: 'Select Language',

    // Search & Actions
    searchPlaceholder: 'Search complaints by ID, title, or location...',
    matchingGrievances: 'Matching Grievances',
    trackInputPlaceholder: 'Enter Grievance ID (e.g. CIV-2026-001)...',
    trackStatusBtn: 'Track Status',
    reportNewIssueBtn: 'Report New Issue',
    reportAnIssueBtn: 'Report an Issue',
    resetFiltersBtn: 'Reset Filters',

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
    filterSubmitted: 'Submitted',
    filterVerified: 'Verified',
    filterInProgress: 'In Progress',
    filterResolved: 'Resolved',
    filterClosed: 'Closed',
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
    noComplaintsFound: 'No complaints found',
    noComplaintsDesc: "You haven't submitted any civic grievances yet. Notice a pothole, water leak, or uncollected waste in your area? Report it to PMC now.",
    noMatchingComplaints: 'No matching complaints',
    noMatchingComplaintsDesc: 'No grievances match your search or filter criteria. Try adjusting your query or resetting filters.',
    retryBtn: 'Retry',
    refreshBtn: 'Refresh',

    // Map & Heatmap
    mapTitle: 'Nearby Civic Issues Map',
    mapSubtitle: 'Interactive view of reported potholes, garbage, and infrastructure issues in your area',
    mapFilterCategory: 'Filter Category',
    mapFilterStatus: 'Filter Status',
    mapAllCategories: 'All Categories',
    mapAllStatuses: 'All Statuses',
    heatmapTitle: 'AI Civic Heatmap & Issue Geolocation',
    heatmapSubtitle: 'Real-time geospatial intelligence tracking potholes, garbage overflow, waterlogging, and streetlight breakdowns across Pune Municipal Corporation wards.',

    // Activity & Notifications
    activityTitle: 'Recent Activity & Notifications',
    notificationsTitle: 'Citizen Notifications',
    markAllRead: 'Mark All Read',
    noNotifications: 'No new notifications',

    // Help
    helpTitle: 'Pune Municipal Corporation Help Center',
    helpSubtitle: '24x7 Citizen Grievance Assistance & Escalation Desk',
    helplineText: 'PMC 24x7 Citizen Helpline: 1800-1030-222',
    whatsappHelpline: 'WhatsApp Grievance: +91 96899 00002',
    feedbackCategory: 'Feedback or Assistance Category',
    messageOrInquiry: 'Your Message or Escalation Request',
    submitInquiryBtn: 'Submit Inquiry',

    // Location
    currentArea: 'Current Area',
    locationDetecting: 'Detecting location...',
    locationPuneDefault: 'Pune Municipal Corporation',
    locationDetailsTitle: 'Location Details',
    locationDetailsSubtitle: 'Specify street address or auto-detect with Pune GPS',
    useCurrentLocationBtn: 'Use My Current Location',
    detectingGps: 'Detecting GPS...',
    streetAddressLabel: 'Street Address / Landmark',
    streetAddressPlaceholder: 'e.g. Near Ganpati Mandir, FC Road, Pune 411004',
    wardOfficeLabel: 'PMC Ward Office (Administrative Zone)',

    // Citizen Settings Page
    settingsAccountSecurityBadge: 'CITIZEN ACCOUNT & SECURITY',
    settingsSubtitle: 'Manage your registered Pune Municipal Corporation citizen profile, preferred ward, and password credentials.',
    settingsProfilePreferences: 'Profile & Ward Preferences',
    settingsProfileSubtitle: 'Your authenticated citizen identity and notification settings',
    verifiedCitizen: 'Verified Citizen',
    settingsProfileSaved: 'Profile preferences saved successfully!',
    fullNameLabel: 'Full Legal Name',
    officialPmcNameHint: 'Official PMC voter/aadhaar verified name',
    registeredEmailLabel: 'Registered Email Address',
    contactPhoneLabel: 'Contact Phone (for SMS updates)',
    primaryWardLabel: 'Primary Pune Municipal Ward',
    selectWardOptional: 'Select PMC Ward (Optional)',
    wardAlertsHint: 'Used to prioritize local ward alerts and neighborhood issues',
    savePreferencesBtn: 'Save Preferences',
    resetPasswordSubtitle: 'Ensure your account is protected with a secure password meeting PMC standards',
    currentPasswordLabel: 'Current / Previous Password',
    currentPasswordPlaceholder: 'Enter your current password',
    newPasswordLabel: 'New Password',
    newPasswordPlaceholder: 'Min. 8 chars, 1 uppercase, 1 symbol',
    ruleMinLength: 'At least 8 characters',
    ruleUppercase: 'At least 1 uppercase letter (A-Z)',
    ruleSpecialChar: 'At least 1 special character or symbol (!@#$%^&*)',
    ruleDifferent: 'Different from current password',
    confirmNewPasswordLabel: 'Confirm New Password',
    confirmNewPasswordPlaceholder: 'Re-enter your new password',
    resetPasswordBtn: 'Reset Password',
    resetPasswordSubmitting: 'Updating Password...',

    // Profile Modal
    profileModalTitle: 'Citizen Profile & Identification',
    tabProfile: 'Profile & Preferences',
    modalClose: 'Close',

    // My Complaints Page
    myComplaintsTitle: 'My Grievances & Complaints',
    myComplaintsSubtitle: 'Track the progress, departmental routing, and on-ground resolution of your submitted PMC issues.',
    complaintsSearchPlaceholder: 'Search by title, ticket #, ward, category...',

    // Report Grievance Page
    reportGrievanceTitle: 'Report a Civic Grievance',
    reportGrievanceSubtitle: 'Upload photo evidence for automated AI severity detection, instant duplicate prevention, and guaranteed SLA resolution.',
    cancelAndBackBtn: 'Cancel & Back',
    aiPhotoScannerTitle: 'Photo Attachment & Gemini AI Scanner',
    aiPhotoScannerIntro: 'Upload a picture of the civic problem. Our Gemini AI engine will analyze image patterns, estimate hazard severity, recommend the municipal department, and auto-populate your grievance.',
    samplePhotosLabel: 'Sample Photos:',
    clickToUploadPhoto: 'Click or drop photo here',
    cameraCaptureBtn: 'Take Live Photo',
    browsePhotoBtn: 'Choose Photo',
    liveCameraTitle: 'Live On-Site Camera',
    snapPhotoBtn: 'Capture Photo',
    switchCameraBtn: 'Switch Camera',
    closeCameraBtn: 'Close Camera',
    startingCamera: 'Connecting to camera hardware...',
    cameraErrorTitle: 'Camera Unavailable',
    cameraNotSupported: 'Live camera stream is not supported in this browser environment. Please select photo manually.',
    cameraPermissionDenied: 'Camera permission was denied. Please allow camera permissions in your browser address bar.',
    cameraNotFound: 'No camera detected on this system. Please connect a camera or choose a photo from files.',
    cameraUnavailable: 'Unable to start camera stream. Please check camera permissions.',
    retryCameraBtn: 'Try Again',
    chooseFilesShort: 'Files',
    complaintTitleLabel: 'Complaint Title',
    complaintTitlePlaceholder: 'Brief summary (e.g. Major pothole near Swargate Bus Stand)',
    categoryLabel: 'Department / Grievance Category',
    priorityLabel: 'Priority & SLA Timeline',
    descriptionLabel: 'Detailed Description',
    descriptionPlaceholder: 'Describe the issue, landmarks, severity, hazards, and how long it has persisted...',
    submitComplaintBtn: 'Submit Grievance',
    submittingComplaintBtn: 'Submitting Grievance...',
    cancelBtn: 'Cancel',
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
    navSettings: 'सेटिंग्ज',
    portalSettings: 'खाते सेटिंग्ज आणि सुरक्षा',
    resetPassword: 'पासवर्ड रीसेट करा',
    navSignOut: 'बाहेर पडा',
    signOutLabel: 'नागरिक पोर्टलवरून बाहेर पडा',
    myProfileAndPreferences: 'माझे प्रोफाईल आणि पसंती',
    helpCenterAndHelplines: 'मदत केंद्र आणि हेल्पलाइन',
    mainServices: 'मुख्य सेवा',
    selectLanguage: 'भाषा निवडा',

    // Search & Actions
    searchPlaceholder: 'तक्रार आयडी किंवा ठिकाणाने शोधा...',
    matchingGrievances: 'जुळणाऱ्या तक्रारी',
    trackInputPlaceholder: 'तक्रार आयडी प्रविष्ट करा...',
    trackStatusBtn: 'स्थिती तपासा',
    reportNewIssueBtn: 'नवीन तक्रार नोंदवा',
    reportAnIssueBtn: 'तक्रार नोंदवा',
    resetFiltersBtn: 'फिल्टर रीसेट करा',

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
    filterSubmitted: 'नोंदवली',
    filterVerified: 'प्रमाणित',
    filterInProgress: 'प्रगतीपथावर',
    filterResolved: 'निवारण झालेल्या',
    filterClosed: 'बंद केलेल्या',
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
    noMatchingComplaints: 'कोणतीही जुळणारी तक्रार आढळली नाही',
    noMatchingComplaintsDesc: 'आपल्या शोध निकषांनुसार कोणतीही तक्रार आढळली नाही. कृपया शोध शब्द बदला किंवा फिल्टर रीसेट करा.',
    retryBtn: 'पुन्हा प्रयत्न करा',
    refreshBtn: 'रिफ्रेश करा',

    // Map & Heatmap
    mapTitle: 'परिसरातील नागरी समस्यांचा नकाशा',
    mapSubtitle: 'खड्डे, कचरा आणि पथदिव्यांच्या समस्यांचा परस्परसंवादी नकाशा',
    mapFilterCategory: 'वर्गवारी निवडा',
    mapFilterStatus: 'स्थिती निवडा',
    mapAllCategories: 'सर्व वर्गवारी',
    mapAllStatuses: 'सर्व स्थिती',
    heatmapTitle: 'एआय नागरी हीटमॅप आणि तक्रारींचे स्थान',
    heatmapSubtitle: 'पुणे महानगरपालिकेच्या सर्व प्रभागांमधील खड्डे, कचरा, सांडपाणी आणि पथदिव्यांच्या समस्यांचा नकाशा.',

    // Activity & Notifications
    activityTitle: 'सूचना आणि घडामोडी',
    notificationsTitle: 'नागरिक सूचना',
    markAllRead: 'सर्व वाचले म्हणून नोंदवा',
    noNotifications: 'कोणतीही नवीन सूचना नाही',

    // Help
    helpTitle: 'पुणे महानगरपालिका मदत केंद्र',
    helpSubtitle: '२४x७ नागरिक तक्रार निवारण व सहाय्यता कक्ष',
    helplineText: 'मनपा २४x७ नागरिक हेल्पलाइन: १८००-१०३०-२२२',
    whatsappHelpline: 'व्हॉट्सअ‍ॅप तक्रार क्रमांक: +९१ ९६८९९ ००००२',
    feedbackCategory: 'अभिप्राय किंवा सहाय्य वर्गवारी',
    messageOrInquiry: 'आपला संदेश किंवा चौकशी',
    submitInquiryBtn: 'चौकशी पाठवा',

    // Location
    currentArea: 'सध्याचे क्षेत्र',
    locationDetecting: 'ठिकाण शोधत आहे...',
    locationPuneDefault: 'पुणे महानगरपालिका',
    locationDetailsTitle: 'ठिकाणाचा तपशील',
    locationDetailsSubtitle: 'रस्त्याचा पत्ता टाका किंवा पुणे जीपीएसने थेट मिळवा',
    useCurrentLocationBtn: 'माझे सध्याचे ठिकाण वापरा',
    detectingGps: 'जीपीएस शोधत आहे...',
    streetAddressLabel: 'रस्त्याचा पत्ता / महत्त्वाची खूण',
    streetAddressPlaceholder: 'उदा. गणपती मंदिराजवळ, एफसी रोड, पुणे ४११००४',
    wardOfficeLabel: 'पुणे मनपा क्षेत्रीय कार्यालय (प्रभाग)',

    // Citizen Settings Page
    settingsAccountSecurityBadge: 'नागरिक खाते आणि सुरक्षा',
    settingsSubtitle: 'आपले नोंदणीकृत पुणे महानगरपालिका नागरिक प्रोफाईल, पसंतीचा प्रभाग आणि पासवर्ड व्यवस्थापित करा.',
    settingsProfilePreferences: 'प्रोफाईल आणि प्रभाग पसंती',
    settingsProfileSubtitle: 'आपली प्रमाणित नागरिक ओळख आणि सूचना सेटिंग्ज',
    verifiedCitizen: 'प्रमाणित नागरिक',
    settingsProfileSaved: 'प्रोफाईल पसंती यशस्वीरीत्या जतन केली!',
    fullNameLabel: 'पूर्ण कायदेशीर नाव',
    officialPmcNameHint: 'अधिकृत मनपा मतदार/आधार प्रमाणित नाव',
    registeredEmailLabel: 'नोंदणीकृत ईमेल पत्ता',
    contactPhoneLabel: 'संपर्क फोन (एसएमएस अपडेटसाठी)',
    primaryWardLabel: 'प्राथमिक पुणे मनपा प्रभाग',
    selectWardOptional: 'मनपा प्रभाग निवडा (पर्यायी)',
    wardAlertsHint: 'स्थानिक प्रभाग सूचना आणि परिसरातील समस्या प्राधान्याने मिळवण्यासाठी',
    savePreferencesBtn: 'पसंती जतन करा',
    resetPasswordSubtitle: 'आपले खाते मनपा मानकांनुसार सुरक्षित पासवर्डने संरक्षित असल्याची खात्री करा',
    currentPasswordLabel: 'सध्याचा / मागील पासवर्ड',
    currentPasswordPlaceholder: 'आपला सध्याचा पासवर्ड टाका',
    newPasswordLabel: 'नवीन पासवर्ड',
    newPasswordPlaceholder: 'किमान ८ अक्षरे, १ मोठे अक्षर, १ चिन्ह',
    ruleMinLength: 'किमान ८ अक्षरे',
    ruleUppercase: 'किमान १ मोठे अक्षर (A-Z)',
    ruleSpecialChar: 'किमान १ विशेष चिन्ह (!@#$%^&*)',
    ruleDifferent: 'सध्याच्या पासवर्डपेक्षा वेगळा',
    confirmNewPasswordLabel: 'नवीन पासवर्डची पुष्टी करा',
    confirmNewPasswordPlaceholder: 'नवीन पासवर्ड पुन्हा टाका',
    resetPasswordBtn: 'पासवर्ड रीसेट करा',
    resetPasswordSubmitting: 'पासवर्ड अपडेट होत आहे...',

    // Profile Modal
    profileModalTitle: 'नागरिक प्रोफाईल आणि ओळख',
    tabProfile: 'प्रोफाईल आणि पसंती',
    modalClose: 'बंद करा',

    // My Complaints Page
    myComplaintsTitle: 'माझ्या तक्रारी आणि गाऱ्हाणी',
    myComplaintsSubtitle: 'आपण नोंदवलेल्या पुणे मनपा तक्रारींची प्रगती, संबंधित विभाग आणि प्रत्यक्ष निवारण स्थिती तपासा.',
    complaintsSearchPlaceholder: 'तक्रार शीर्षक, तिकीट क्र., प्रभाग, वर्गवारीने शोधा...',

    // Report Grievance Page
    reportGrievanceTitle: 'नागरी तक्रार नोंदवा',
    reportGrievanceSubtitle: 'एआय द्वारे तीव्रता तपासणी, नक्कल प्रतिबंध आणि वेळेत निवारणासाठी फोटो अपलोड करा.',
    cancelAndBackBtn: 'रद्द करा आणि मागे जा',
    aiPhotoScannerTitle: 'फोटो जोडा आणि जेमिनी एआय स्कॅनर',
    aiPhotoScannerIntro: 'समस्येचा फोटो अपलोड करा. आमचे जेमिनी एआय इंजिन फोटोचे विश्लेषण करून योग्य विभाग सुचवेल आणि तक्रार फॉर्म भरेल.',
    samplePhotosLabel: 'नमुना फोटो:',
    clickToUploadPhoto: 'फोटो अपलोड करण्यासाठी येथे क्लिक करा',
    cameraCaptureBtn: 'कॅमेऱ्याने थेट फोटो घ्या',
    browsePhotoBtn: 'फोटो निवडा',
    liveCameraTitle: 'थेट ऑन-साइट कॅमेरा',
    snapPhotoBtn: 'फोटो काढा',
    switchCameraBtn: 'कॅमेरा बदला',
    closeCameraBtn: 'कॅमेरा बंद करा',
    startingCamera: 'कॅमेऱ्याशी कनेक्ट करत आहे...',
    cameraErrorTitle: 'कॅमेरा अनुपलब्ध आहे',
    cameraNotSupported: 'या ब्राउझरमध्ये थेट कॅमेरा समर्थित नाही. कृपया फाईल निवडा.',
    cameraPermissionDenied: 'कॅमेरा परवानगी नाकारली गेली आहे. कृपया ब्राऊझर सेटिंग्जमध्ये कॅमेरा सुरू करा.',
    cameraNotFound: 'या डिव्हाइसवर कॅमेरा आढळला नाही. कृपया कॅमेरा जोडा किंवा फोटो निवडा.',
    cameraUnavailable: 'कॅमेरा सुरू करण्यात अडचण आली. कृपया परवानगी तपासा.',
    retryCameraBtn: 'पुन्हा प्रयत्न करा',
    chooseFilesShort: 'फायली',
    complaintTitleLabel: 'तक्रारीचे शीर्षक',
    complaintTitlePlaceholder: 'थोडक्यात माहिती (उदा. स्वारगेट बस स्थानकाजवळ मोठा खड्डा)',
    categoryLabel: 'मनपा विभाग / तक्रार वर्गवारी',
    priorityLabel: 'प्राधान्य आणि एसएलए कालमर्यादा',
    descriptionLabel: 'सविस्तर वर्णन',
    descriptionPlaceholder: 'समस्या, खाणाखुणा, तीव्रता आणि किती दिवसांपासून समस्या आहे याचे वर्णन करा...',
    submitComplaintBtn: 'नागरी तक्रार दाखल करा',
    submittingComplaintBtn: 'नोंदणी होत आहे...',
    cancelBtn: 'रद्द करा',
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
    navSettings: 'सेटिंग्स',
    portalSettings: 'खाता सेटिंग्स और सुरक्षा',
    resetPassword: 'पासवर्ड रीसेट करें',
    navSignOut: 'लॉग आउट',
    signOutLabel: 'नागरिक पोर्टल से लॉग आउट करें',
    myProfileAndPreferences: 'मेरी प्रोफ़ाइल और प्राथमिकताएं',
    helpCenterAndHelplines: 'सहायता केंद्र और हेल्पलाइन',
    mainServices: 'मुख्य सेवाएं',
    selectLanguage: 'भाषा चुनें',

    // Search & Actions
    searchPlaceholder: 'शिकायत आईडी या स्थान से खोजें...',
    matchingGrievances: 'मेल खाती शिकायतें',
    trackInputPlaceholder: 'शिकायत आईडी दर्ज करें...',
    trackStatusBtn: 'स्थिति जांचें',
    reportNewIssueBtn: 'नई शिकायत दर्ज करें',
    reportAnIssueBtn: 'शिकायत दर्ज करें',
    resetFiltersBtn: 'फ़िल्टर रीसेट करें',

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
    filterSubmitted: 'दर्ज',
    filterVerified: 'सत्यापित',
    filterInProgress: 'प्रगति पर',
    filterResolved: 'हल किया गया',
    filterClosed: 'बंद',
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
    noMatchingComplaints: 'कोई मेल खाती शिकायत नहीं मिली',
    noMatchingComplaintsDesc: 'आपके खोज या फ़िल्टर मानदंडों से कोई शिकायत मेल नहीं खाती। कृपया फ़िल्टर रीसेट करें।',
    retryBtn: 'पुनः प्रयास करें',
    refreshBtn: 'रिफ्रेश करें',

    // Map & Heatmap
    mapTitle: 'आस-पास की नागरिक समस्याओं का नक्शा',
    mapSubtitle: 'गड्ढे, कचरा और स्ट्रीटलाइट समस्याओं का इंटरएक्टिव नक्शा',
    mapFilterCategory: 'श्रेणी चुनें',
    mapFilterStatus: 'स्थिति चुनें',
    mapAllCategories: 'सभी श्रेणियां',
    mapAllStatuses: 'सभी स्थितियां',
    heatmapTitle: 'एआई नागरिक हीटमैप और समस्या स्थान',
    heatmapSubtitle: 'पुणे नगर निगम के सभी वार्डों में गड्ढों, कचरे और स्ट्रीटलाइट समस्याओं का वास्तविक समय नक्शा।',

    // Activity & Notifications
    activityTitle: 'हाल की गतिविधियां व सूचनाएं',
    notificationsTitle: 'नागरिक सूचनाएं',
    markAllRead: 'सभी पढ़ा हुआ चिह्नित करें',
    noNotifications: 'कोई नई सूचना नहीं',

    // Help
    helpTitle: 'पुणे नगर निगम सहायता केंद्र',
    helpSubtitle: '२४x७ नागरिक शिकायत निवारण और सहायता केंद्र',
    helplineText: 'पीएमसी २४x७ नागरिक हेल्पलाइन: १८००-१०३०-२२२',
    whatsappHelpline: 'व्हाट्सएप शिकायत नंबर: +९१ ९६८९९ ००००२',
    feedbackCategory: 'प्रतिक्रिया या सहायता श्रेणी',
    messageOrInquiry: 'आपका संदेश या पूछताछ',
    submitInquiryBtn: 'पूछताछ भेजें',

    // Location
    currentArea: 'वर्तमान क्षेत्र',
    locationDetecting: 'स्थान खोजा जा रहा है...',
    locationPuneDefault: 'पुणे नगर निगम',
    locationDetailsTitle: 'स्थान का विवरण',
    locationDetailsSubtitle: 'सड़क का पता दर्ज करें या जीपीएस से स्वतः पहचानें',
    useCurrentLocationBtn: 'मेरा वर्तमान स्थान उपयोग करें',
    detectingGps: 'जीपीएस खोज रहा है...',
    streetAddressLabel: 'सड़क का पता / स्थलचिह्न',
    streetAddressPlaceholder: 'उदा. गणपति मंदिर के पास, एफसी रोड, पुणे 411004',
    wardOfficeLabel: 'पीएमसी वार्ड कार्यालय (प्रशासनिक क्षेत्र)',

    // Citizen Settings Page
    settingsAccountSecurityBadge: 'नागरिक खाता और सुरक्षा',
    settingsSubtitle: 'अपना पंजीकृत पुणे नगर निगम नागरिक प्रोफ़ाइल, पसंदीदा वार्ड और पासवर्ड प्रबंधित करें।',
    settingsProfilePreferences: 'प्रोफ़ाइल और वार्ड प्राथमिकताएं',
    settingsProfileSubtitle: 'आपकी प्रमाणित नागरिक पहचान और सूचना सेटिंग्स',
    verifiedCitizen: 'सत्यापित नागरिक',
    settingsProfileSaved: 'प्रोफ़ाइल प्राथमिकताएं सफलतापूर्वक सहेजी गईं!',
    fullNameLabel: 'पूर्ण कानूनी नाम',
    officialPmcNameHint: 'आधिकारिक पीएमसी मतदाता/आधार सत्यापित नाम',
    registeredEmailLabel: 'पंजीकृत ईमेल पता',
    contactPhoneLabel: 'संपर्क फ़ोन (एसएमएस अपडेट के लिए)',
    primaryWardLabel: 'प्राथमिक पुणे नगर निगम वार्ड',
    selectWardOptional: 'पीएमसी वार्ड चुनें (वैकल्पिक)',
    wardAlertsHint: 'स्थानीय वार्ड अलर्ट और आस-पास की समस्याओं को प्राथमिकता देने के लिए',
    savePreferencesBtn: 'प्राथमिकताएं सहेजें',
    resetPasswordSubtitle: 'सुनिश्चित करें कि आपका खाता पीएमसी मानकों के अनुरूप सुरक्षित पासवर्ड से सुरक्षित है',
    currentPasswordLabel: 'वर्तमान / पिछला पासवर्ड',
    currentPasswordPlaceholder: 'अपना वर्तमान पासवर्ड दर्ज करें',
    newPasswordLabel: 'नया पासवर्ड',
    newPasswordPlaceholder: 'न्यूनतम 8 वर्ण, 1 बड़ा अक्षर, 1 प्रतीक',
    ruleMinLength: 'कम से कम 8 वर्ण',
    ruleUppercase: 'कम से कम 1 बड़ा अक्षर (A-Z)',
    ruleSpecialChar: 'कम से कम 1 विशेष वर्ण या प्रतीक (!@#$%^&*)',
    ruleDifferent: 'वर्तमान पासवर्ड से भिन्न',
    confirmNewPasswordLabel: 'नए पासवर्ड की पुष्टि करें',
    confirmNewPasswordPlaceholder: 'अपना नया पासवर्ड पुनः दर्ज करें',
    resetPasswordBtn: 'पासवर्ड रीसेट करें',
    resetPasswordSubmitting: 'पासवर्ड अपडेट हो रहा है...',

    // Profile Modal
    profileModalTitle: 'नागरिक प्रोफ़ाइल और पहचान',
    tabProfile: 'मेरी प्रोफ़ाइल और प्राथमिकताएं',
    modalClose: 'बंद करें',

    // My Complaints Page
    myComplaintsTitle: 'मेरी शिकायतें और समस्याएं',
    myComplaintsSubtitle: 'अपने प्रस्तुत पीएमसी मुद्दों की प्रगति, विभागीय रूटिंग और जमीनी समाधान की स्थिति ट्रैक करें।',
    complaintsSearchPlaceholder: 'शीर्षक, टिकट संख्या, वार्ड, श्रेणी से खोजें...',

    // Report Grievance Page
    reportGrievanceTitle: 'नागरिक शिकायत दर्ज करें',
    reportGrievanceSubtitle: 'स्वचालित एआई गंभीरता पहचान और त्वरित समाधान के लिए फोटो प्रमाण अपलोड करें।',
    cancelAndBackBtn: 'रद्द करें और वापस जाएं',
    aiPhotoScannerTitle: 'फोटो संलग्नक और जेमिनी एआई स्कैनर',
    aiPhotoScannerIntro: 'समस्या का फोटो अपलोड करें। हमारा जेमिनी एआई इंजन फोटो का विश्लेषण कर उचित विभाग सुझाएगा।',
    samplePhotosLabel: 'नमूना फोटो:',
    clickToUploadPhoto: 'फोटो अपलोड करने के लिए यहां क्लिक करें',
    cameraCaptureBtn: 'लाइव फोटो लें',
    browsePhotoBtn: 'फोटो चुनें',
    liveCameraTitle: 'लाइव ऑन-साइट कैमरा',
    snapPhotoBtn: 'फोटो खींचें',
    switchCameraBtn: 'कैमरा बदलें',
    closeCameraBtn: 'कैमरा बंद करें',
    startingCamera: 'कैमरे से कनेक्ट हो रहा है...',
    cameraErrorTitle: 'कैमरा अनुपलब्ध है',
    cameraNotSupported: 'इस ब्राउज़र में लाइव कैमरा समर्थित नहीं है। कृपया फ़ाइल चुनें।',
    cameraPermissionDenied: 'कैमरा अनुमति अस्वीकृत कर दी गई है। कृपया ब्राउज़र सेटिंग्स में कैमरा सक्षम करें।',
    cameraNotFound: 'इस डिवाइस पर कोई कैमरा नहीं मिला। कृपया कैमरा कनेक्ट करें या फ़ोटो चुनें।',
    cameraUnavailable: 'कैमरा शुरू करने में असमर्थ। कृपया अनुमति जांचें।',
    retryCameraBtn: 'पुनः प्रयास करें',
    chooseFilesShort: 'फ़ाइलें',
    complaintTitleLabel: 'शिकायत का शीर्षक',
    complaintTitlePlaceholder: 'संक्षिप्त सारांश (उदा. स्वारगेट बस स्टैंड के पास बड़ा गड्ढा)',
    categoryLabel: 'विभाग / शिकायत श्रेणी',
    priorityLabel: 'प्राथमिकता और समय सीमा',
    descriptionLabel: 'विस्तृत विवरण',
    descriptionPlaceholder: 'समस्या, स्थलचिह्न, गंभीरता और कितने समय से है इसका विवरण दें...',
    submitComplaintBtn: 'नागरिक शिकायत सबमिट करें',
    submittingComplaintBtn: 'सबमिट हो रहा है...',
    cancelBtn: 'रद्द करें',
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

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = language;
      }
    } catch {
      // Ignore
    }
  }, [language]);

  const setLanguage = (newLang) => {
    if (translations[newLang]) {
      setLanguageState(newLang);
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
