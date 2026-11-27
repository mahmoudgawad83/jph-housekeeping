// Report wording in French and English. `both` prints French first, then English.
const W = {
  daily: ['Rapport quotidien Housekeeping', 'Daily Housekeeping Report'],
  weekly: ['Rapport hebdomadaire Housekeeping', 'Weekly Housekeeping Report'],
  summary: ['Synthèse', 'Summary'],
  kpiTotal: ['Observations', 'Observations'],
  kpiOpen: ['Ouvertes', 'Open'],
  kpiClosed: ['Clôturées', 'Closed'],
  kpiHigh: ['Élevées / critiques', 'High / critical'],
  byCategory: ['Par catégorie', 'By category'],
  bySeverity: ['Par gravité', 'By severity'],
  map: ['Carte des observations', 'Observation map'],
  hotspots: ['Points chauds récurrents', 'Repeat hotspots'],
  hotspotLine: ['{n} observations en {d} jours dans un rayon de {r} m', '{n} observations over {d} days within {r} m'],
  details: ['Détail des observations', 'Observation details'],
  carried: ['Points ouverts reportés', 'Open items carried over'],
  noneCarried: ['Aucun point ouvert reporté.', 'No open items carried over.'],
  area: ['Zone', 'Area'], category: ['Catégorie', 'Category'], severity: ['Gravité', 'Severity'],
  supervisor: ['Superviseur', 'Supervisor'], time: ['Heure', 'Time'], coords: ['Coordonnées', 'Coordinates'],
  comment: ['Commentaire', 'Comment'], status: ['Statut', 'Status'], age: ['Âge', 'Age'], date: ['Date', 'Date'],
  open: ['Ouverte', 'Open'], closed: ['Clôturée', 'Closed'],
  after: ['Photo après', 'After photo'], drive: ['Archive Drive', 'Drive archive'],
  photoArchived: ['Photo archivée', 'Photo archived'],
  generated: ['Généré le', 'Generated'], page: ['Page', 'Page'],
  noInputTitle: ['Aucune saisie', 'No inputs'],
  noInputSentence: ['Aucune observation n’a été saisie pour ce Bloc aujourd’hui.', 'No observation was recorded for this Bloc today.'],
  obsSentence: ['{n} observation(s) enregistrée(s) par {s} superviseur(s).', '{n} observation(s) recorded by {s} supervisor(s).'],
  highSentence: ['{n} de gravité élevée ou critique.', '{n} rated high or critical.'],
  topSentence: ['Problème le plus fréquent : {c} ({n}).', 'Most frequent issue: {c} ({n}).'],
  okSentence: ['{n} contrôle(s) « propreté OK ».', '{n} “cleanliness OK” check(s).'],
  openSentence: ['{n} point(s) ouvert(s), dont {c} reporté(s) des jours précédents ; {k} clôturé(s) aujourd’hui.', '{n} item(s) open, {c} carried over from previous days; {k} closed today.'],
  hotspotSentence: ['{n} point(s) chaud(s) récurrent(s) signalé(s) : {a}.', '{n} repeat hotspot(s) flagged: {a}.'],
  trend: ['Tendance quotidienne', 'Daily trend'],
  topAreas: ['Zones les plus signalées', 'Most reported areas'],
  activity: ['Activité des superviseurs', 'Supervisor activity'],
  closeTime: ['Délai de clôture', 'Time to close'],
  closeLine: ['{n} clôturée(s) · médiane {m} · moyenne {a}', '{n} closed · median {m} · mean {a}'],
  wkObs: ['{n} observations cette semaine', '{n} observations this week'],
  wkUp: ['(+{p} % vs {n} la semaine précédente)', '(+{p}% vs {n} the previous week)'],
  wkDown: ['(-{p} % vs {n} la semaine précédente)', '(-{p}% vs {n} the previous week)'],
  wkClose: ['{n} point(s) clôturé(s), délai médian {h}.', '{n} item(s) closed, median time to close {h}.'],
  wkOpen: ['{n} point(s) encore ouvert(s) en fin de période.', '{n} item(s) still open at the end of the period.'],
  alertSubject: ['Alerte : aucune saisie – {b} – {d}', 'Alert: no inputs – {b} – {d}'],
  alertBody: ['Aucune observation n’a été saisie pour {b} aujourd’hui ({d}) à {t}.', 'No observation has been recorded for {b} today ({d}) as of {t}.'],
  emailIntro: ['Veuillez trouver ci-joint le rapport.', 'Please find the report attached.'],
  emailDrive: ['Copie archivée sur Google Drive', 'Archived copy in Google Drive'],
  wordLink: ['Rapport Word (Google Drive)', 'Word report (Google Drive)'],
  pdfTooBig: ['Le PDF est trop volumineux pour l’e-mail ; demandez une copie à l’administrateur.', 'The PDF is too large for e-mail; please ask the administrator for a copy.'],
  wordFollows: ['Le rapport Word suit dans un second e-mail.', 'The Word report follows in a second e-mail.'],
  wordTooBig: ['Le rapport Word est trop volumineux pour l’e-mail ; demandez une copie à l’administrateur.', 'The Word report is too large for e-mail; please ask the administrator for a copy.'],
};

export function makeTr(language, settings) {
  const pickList = (list, key) => (list || []).find((x) => x.key === key) || { en: key, fr: key };
  const fill = (s, v) => Object.entries(v).reduce((acc, [k, val]) => acc.replaceAll(`{${k}}`, val), s);
  const tr = (key, vars = {}) => {
    const [fr, en] = W[key] || [key, key];
    if (language === 'fr') return fill(fr, vars);
    if (language === 'en') return fill(en, vars);
    return fr === en ? fill(fr, vars) : `${fill(fr, vars)} / ${fill(en, vars)}`;
  };
  // Long sentences: in "both" mode put the languages on separate paragraphs.
  tr.para = (key, vars = {}) => {
    const [fr, en] = W[key] || [key, key];
    return language === 'both' ? [fill(fr, vars), fill(en, vars)] : [fill(language === 'fr' ? fr : en, vars)];
  };
  tr.only = (lang) => makeTr(lang, settings);
  const item = (list, k) => { const x = pickList(list, k); return language === 'fr' ? x.fr : language === 'en' ? x.en : (x.fr === x.en ? x.en : `${x.fr} / ${x.en}`); };
  tr.cat = (k) => item(settings.categories, k);
  tr.sev = (k) => item(settings.severities, k);
  tr.language = language;
  return tr;
}
