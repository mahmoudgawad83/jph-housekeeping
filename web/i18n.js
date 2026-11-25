// UI text in English and French. Language choice is remembered on the device.
const T = {
  en: {
    appName: 'JPH Housekeeping',
    signIn: 'Sign in', username: 'Username', password: 'Password',
    signInHelp: 'Use the username and password given by your administrator.',
    badLogin: 'Wrong username or password.',
    signOut: 'Sign out', admin: 'Admin', map: 'Map',
    today: 'Today', open: 'Open', last7: 'Last 7 days',
    newObs: 'New observation', takePhoto: 'Take photo', retake: 'Retake photo',
    location: 'Location', locating: 'Getting GPS position…', gpsOk: 'GPS captured (±{a} m)',
    gpsFail: 'GPS unavailable. Tap the map to place the pin.', tapMap: 'Tap the map to adjust the pin',
    area: 'Area', areaHint: 'e.g. Conveyor C3, Gate 2, Storage hall',
    category: 'Category', severity: 'Severity', comment: 'Comment', optional: 'optional',
    save: 'Save', saving: 'Saving…', cancel: 'Cancel', back: 'Back', close: 'Close',
    saved: 'Observation saved', photoRequired: 'Please take a photo first.',
    areaRequired: 'Please enter the area.', chooseCategory: 'Choose a category.', chooseSeverity: 'Choose a severity.',
    noObs: 'No observations for this view yet.', status: 'Status',
    statusOpen: 'Open', statusClosed: 'Closed', markClosed: 'Mark as closed', reopen: 'Reopen',
    afterPhoto: 'After photo', closingComment: 'Closing comment',
    closedOk: 'Marked as closed', reopenedOk: 'Reopened',
    by: 'by', at: 'at', time: 'Time', coords: 'Coordinates', openInDrive: 'Open in Google Drive',
    noBlocs: 'You are not assigned to any Bloc yet. Ask your administrator.',
    bloc: 'Bloc', blocs: 'Blocs', users: 'Users', recipients: 'Recipients', settings: 'Settings', reports: 'Reports',
    add: 'Add', edit: 'Edit', remove: 'Remove', name: 'Name', email: 'Email', role: 'Role', active: 'Active',
    fullName: 'Full name', supervisor: 'Supervisor', administrator: 'Administrator',
    daily: 'Daily', weekly: 'Weekly', assignedBlocs: 'Assigned Blocs', newPassword: 'New password',
    setPassword: 'Set password', passwordSet: 'Password updated', userCreated: 'User created',
    setCenter: 'Use current map view as Bloc centre', centerSaved: 'Bloc map centre saved',
    dailyTime: 'Daily report time', weeklyDay: 'Weekly report day', weeklyTime: 'Weekly report time',
    noInputTime: 'Warn if no inputs by', alertEmails: 'Warning recipients (comma separated)',
    senderName: 'Sender name', reportLanguage: 'Report language', both: 'French + English',
    saveSettings: 'Save settings', settingsSaved: 'Settings saved',
    days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    period: 'Period', type: 'Type', sentAt: 'Sent', none: 'None yet',
    offline: 'You are offline. Saving will work again when the connection returns.',
    error: 'Something went wrong: {m}', confirmRemove: 'Remove this item?',
    install: 'Install app', language: 'Français',
    pins: '{n} observations', selectBloc: 'Select Bloc',
  },
  fr: {
    appName: 'JPH Housekeeping',
    signIn: 'Se connecter', username: "Nom d'utilisateur", password: 'Mot de passe',
    signInHelp: "Utilisez le nom d'utilisateur et le mot de passe fournis par votre administrateur.",
    badLogin: "Nom d'utilisateur ou mot de passe incorrect.",
    signOut: 'Se déconnecter', admin: 'Admin', map: 'Carte',
    today: "Aujourd'hui", open: 'Ouvertes', last7: '7 derniers jours',
    newObs: 'Nouvelle observation', takePhoto: 'Prendre une photo', retake: 'Reprendre la photo',
    location: 'Position', locating: 'Recherche de la position GPS…', gpsOk: 'GPS enregistré (±{a} m)',
    gpsFail: 'GPS indisponible. Touchez la carte pour placer le repère.', tapMap: 'Touchez la carte pour ajuster le repère',
    area: 'Zone', areaHint: 'ex. Convoyeur C3, Porte 2, Hangar de stockage',
    category: 'Catégorie', severity: 'Gravité', comment: 'Commentaire', optional: 'facultatif',
    save: 'Enregistrer', saving: 'Enregistrement…', cancel: 'Annuler', back: 'Retour', close: 'Fermer',
    saved: 'Observation enregistrée', photoRequired: "Veuillez d'abord prendre une photo.",
    areaRequired: 'Veuillez saisir la zone.', chooseCategory: 'Choisissez une catégorie.', chooseSeverity: 'Choisissez une gravité.',
    noObs: 'Aucune observation pour cette vue.', status: 'Statut',
    statusOpen: 'Ouverte', statusClosed: 'Clôturée', markClosed: 'Clôturer', reopen: 'Rouvrir',
    afterPhoto: 'Photo après', closingComment: 'Commentaire de clôture',
    closedOk: 'Observation clôturée', reopenedOk: 'Observation rouverte',
    by: 'par', at: 'à', time: 'Heure', coords: 'Coordonnées', openInDrive: 'Ouvrir dans Google Drive',
    noBlocs: "Vous n'êtes affecté à aucun Bloc. Contactez votre administrateur.",
    bloc: 'Bloc', blocs: 'Blocs', users: 'Utilisateurs', recipients: 'Destinataires', settings: 'Paramètres', reports: 'Rapports',
    add: 'Ajouter', edit: 'Modifier', remove: 'Supprimer', name: 'Nom', email: 'E-mail', role: 'Rôle', active: 'Actif',
    fullName: 'Nom complet', supervisor: 'Superviseur', administrator: 'Administrateur',
    daily: 'Quotidien', weekly: 'Hebdomadaire', assignedBlocs: 'Blocs affectés', newPassword: 'Nouveau mot de passe',
    setPassword: 'Définir le mot de passe', passwordSet: 'Mot de passe mis à jour', userCreated: 'Utilisateur créé',
    setCenter: 'Utiliser la vue actuelle comme centre du Bloc', centerSaved: 'Centre du Bloc enregistré',
    dailyTime: 'Heure du rapport quotidien', weeklyDay: 'Jour du rapport hebdomadaire', weeklyTime: 'Heure du rapport hebdomadaire',
    noInputTime: 'Alerter si aucune saisie avant', alertEmails: "Destinataires des alertes (séparés par des virgules)",
    senderName: "Nom de l'expéditeur", reportLanguage: 'Langue des rapports', both: 'Français + anglais',
    saveSettings: 'Enregistrer', settingsSaved: 'Paramètres enregistrés',
    days: ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'],
    period: 'Période', type: 'Type', sentAt: 'Envoyé', none: 'Aucun pour le moment',
    offline: 'Vous êtes hors ligne. L’enregistrement fonctionnera au retour de la connexion.',
    error: 'Une erreur est survenue : {m}', confirmRemove: 'Supprimer cet élément ?',
    install: "Installer l'application", language: 'English',
    pins: '{n} observations', selectBloc: 'Choisir le Bloc',
  },
};

let lang = 'fr';
try {
  lang = localStorage.getItem('lang') || ((navigator.language || '').startsWith('en') ? 'en' : 'fr');
} catch { /* storage unavailable: keep French */ }

export function getLang() { return lang; }
export function setLang(l) { lang = l; try { localStorage.setItem('lang', l); } catch { /* ignore */ } document.documentElement.lang = l; }
export function t(key, vars = {}) {
  let s = (T[lang] && T[lang][key]) ?? T.en[key] ?? key;
  if (typeof s === 'string') for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
export function label(item) { return item ? (item[lang] || item.en || item.key) : ''; }
