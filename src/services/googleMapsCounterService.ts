import { supabase } from './supabaseClient';

/**
 * Servizio per il conteggio delle chiamate al servizio Google Maps
 * Salva i dati nella tabella conteggi_mensili_google con formato mese-anno
 */

export interface GoogleMapsCountRecord {
  mese: string; // Formato "MM-YYYY"
  conteggi: number;
  ultima_richiesta: string;
}

/**
 * Genera la chiave mese corrente nel formato "MM-YYYY"
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // getMonth() returns 0-11, so add 1
  const year = now.getFullYear().toString();
  return `${month}-${year}`;
}

/**
 * Incrementa il contatore delle chiamate Google Maps per il mese corrente
 * Se non esiste una riga per il mese corrente, ne crea una nuova
 */
export async function incrementGoogleMapsUsage(): Promise<void> {
  try {
    const currentMonthKey = getCurrentMonthKey();
    const now = new Date().toISOString();

    console.log('📊 [Google Maps Counter] Incrementing usage for month:', currentMonthKey);

    // Prima proviamo a vedere se esiste già una riga per questo mese
    const { data: existingRecord, error: selectError } = await supabase
      .from('conteggi_mensili_google')
      .select('conteggi')
      .eq('mese', currentMonthKey)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ [Google Maps Counter] Error checking existing record:', selectError);
      // Non blocchiamo il funzionamento dell'app per errori di conteggio
      return;
    }

    if (existingRecord) {
      // Riga esistente, incrementiamo il contatore
      const newCount = existingRecord.conteggi + 1;

      const { error: updateError } = await supabase
        .from('conteggi_mensili_google')
        .update({
          conteggi: newCount,
          ultima_richiesta: now
        })
        .eq('mese', currentMonthKey);

      if (updateError) {
        console.error('❌ [Google Maps Counter] Error updating record:', updateError);
      } else {
        console.log('✅ [Google Maps Counter] Updated existing record. New count:', newCount);
      }
    } else {
      // Riga non esistente, creiamo una nuova
      const { error: insertError } = await supabase
        .from('conteggi_mensili_google')
        .insert({
          mese: currentMonthKey,
          conteggi: 1,
          ultima_richiesta: now
        });

      if (insertError) {
        console.error('❌ [Google Maps Counter] Error inserting new record:', insertError);
      } else {
        console.log('✅ [Google Maps Counter] Created new record for month:', currentMonthKey);
      }
    }
  } catch (error) {
    console.error('❌ [Google Maps Counter] Unexpected error:', error);
    // Non blocchiamo il funzionamento dell'app per errori di conteggio
  }
}

/**
 * Recupera i dati di conteggio per un mese specifico
 */
export async function getGoogleMapsUsage(monthKey?: string): Promise<GoogleMapsCountRecord | null> {
  try {
    const targetMonth = monthKey || getCurrentMonthKey();

    const { data, error } = await supabase
      .from('conteggi_mensili_google')
      .select('*')
      .eq('mese', targetMonth)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ [Google Maps Counter] Error fetching usage:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ [Google Maps Counter] Unexpected error fetching usage:', error);
    return null;
  }
}

/**
 * Recupera tutti i record di conteggio (ordinati per mese decrescente)
 */
export async function getAllGoogleMapsUsage(): Promise<GoogleMapsCountRecord[]> {
  try {
    const { data, error } = await supabase
      .from('conteggi_mensili_google')
      .select('*')
      .order('mese', { ascending: false });

    if (error) {
      console.error('❌ [Google Maps Counter] Error fetching all usage:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ [Google Maps Counter] Unexpected error fetching all usage:', error);
    return [];
  }
}
