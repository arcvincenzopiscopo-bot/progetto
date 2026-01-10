export interface User {
  id?: string;
  username: string;
  admin: number;
}

export interface PointOfInterest {
  id: string;
  username: string;
  ispezionabile: number;
  created_at: string;
}

/**
 * Verifica se l'utente può eliminare un POI specifico
 * @param poi Il POI da verificare
 * @param user L'utente corrente
 * @returns true se l'utente può eliminare il POI
 */
export function canDeletePoi(poi: PointOfInterest, user: User): boolean {
  // Verifica se il POI è stato creato oggi
  const poiDate = new Date(poi.created_at);
  const today = new Date();
  const isCreatedToday =
    poiDate.getDate() === today.getDate() &&
    poiDate.getMonth() === today.getMonth() &&
    poiDate.getFullYear() === today.getFullYear();

  // Logica di permessi basata su admin level e stato del POI
  if (poi.ispezionabile === 0) {
    // POI già ispezionati (rossi)
    if (user.admin === 2) {
      return true; // admin=2 può eliminare tutti i POI rossi
    } else if (user.admin === 1 && isCreatedToday) {
      return true; // admin=1 può eliminare POI rossi creati oggi
    } else if (user.admin === 0 && isCreatedToday && poi.username === user.username) {
      return true; // admin=0 può eliminare POI rossi creati oggi da se stesso
    }
    return false;
  } else if (poi.ispezionabile === 1) {
    // POI ispezionabili (verdi)
    if (user.admin !== 0) {
      return true; // admin possono eliminare tutti i POI verdi
    } else if (isCreatedToday && poi.username === user.username) {
      return true; // admin=0 può eliminare POI verdi creati oggi da se stesso
    }
    return false;
  } else {
    // POI in attesa di approvazione (gialli) - ispezionabile=2
    // Possono essere eliminati se creati oggi, indipendentemente dal livello admin
    return isCreatedToday;
  }
}