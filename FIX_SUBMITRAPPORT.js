// NOUVELLE FONCTION submitRapport avec debugging
// Remplacer l'ancienne fonction dans index.html

const submitRapport = async rapport => {
  console.log('=== DEBUT SOUMISSION RAPPORT ===');
  console.log('Redacteur:', rapport.redacteur);
  console.log('Date:', rapport.date);
  console.log('Projet:', rapport.projet);

  const supabaseData = {
    date: rapport.date,
    redacteur: rapport.redacteur,
    projet: rapport.projet,
    projet_nom: rapport.projetNom,
    adresse: rapport.adresse,
    meteo: rapport.meteo,
    temperature: rapport.temperature,
    main_oeuvre: rapport.mainOeuvre,
    materiaux: rapport.materiaux,
    equipements: rapport.equipements,
    ordres_travail: rapport.ordresTravail,
    reunions: rapport.reunions,
    notes_generales: rapport.notesGenerales,
    problemes_securite: rapport.problemesSecurite,
    total_heures_mo: rapport.totalHeuresMO,
    total_photos: rapport.totalPhotos,
    has_extras: rapport.hasExtras,
    total_extras: rapport.totalExtras,
  };

  console.log('Data a envoyer:', JSON.stringify(supabaseData, null, 2));

  try {
    console.log('Envoi a Supabase...');
    const { data, error } = await supabase.from('rapports').insert([supabaseData]).select();

    console.log('Reponse Supabase - data:', data);
    console.log('Reponse Supabase - error:', error);

    if (error) {
      console.error('ERREUR SUPABASE:', error.message, error.details, error.hint);
      alert('ERREUR: ' + error.message);
      throw new Error('Supabase: ' + error.message);
    }

    if (!data || data.length === 0) {
      console.error('ERREUR: Pas de data retournee');
      alert('ERREUR: Aucune donnee retournee');
      throw new Error('Aucune donnee retournee par Supabase');
    }

    console.log('=== RAPPORT SAUVEGARDE AVEC SUCCES ===');
    console.log('ID:', data[0].id);

    // Email backup (non-bloquant)
    sendEmailBackup(rapport)
      .then(result => {
        console.log('Email backup:', result.success ? 'OK' : 'ECHEC');
      })
      .catch(e => console.log('Email backup error:', e));

    return data[0];
  } catch (err) {
    console.error('=== ECHEC SOUMISSION ===');
    console.error('Erreur:', err.message);
    alert('ECHEC ENVOI: ' + err.message + '\nRapport sauvegarde localement.');

    // Fallback localStorage
    const pending = JSON.parse(localStorage.getItem('dr_rapports_pending') || '[]');
    pending.push({ ...rapport, failedAt: new Date().toISOString(), error: err.message });
    localStorage.setItem('dr_rapports_pending', JSON.stringify(pending));
    console.log('Rapport sauvegarde localement. Total pending:', pending.length);

    throw err;
  }
};

// ========================================
// INSTRUCTIONS:
// 1. Ouvrir index.html dans un editeur
// 2. Rechercher "const submitRapport = async"
// 3. Remplacer toute la fonction jusqu'a la fermeture };
//    (chercher le prochain "const sendEmailBackup" pour savoir ou finir)
// 4. Coller ce code a la place
// 5. git add . && git commit -m "fix: add debug logs to submitRapport" && git push
// ========================================
