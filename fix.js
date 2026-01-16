// Fix pour le bug de détection d'erreur Supabase
// Remplacer dans index.html ligne ~241:

// ANCIEN CODE (buggy):
// if (supabaseResult.status === 'rejected' || supabaseResult.value.error) {

// NOUVEAU CODE (correct):
// const hasSupabaseError = supabaseResult.status === 'rejected' || 
//     (supabaseResult.value.error && Object.keys(supabaseResult.value.error).length > 0);
// if (hasSupabaseError) {

// Le problème: supabaseResult.value.error peut être {} (objet vide) 
// qui est truthy en JavaScript mais n'est pas une vraie erreur
