import { getDb } from './db'

export function seedDefaultTemplates(propertyId: number) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM message_templates WHERE property_id = ?').all(propertyId)
  if (existing.length > 0) return

  const templates = [
    {
      name: 'Réservation confirmée',
      trigger: 'booking_confirmed',
      delay_hours: 0,
      subject: 'Merci pour votre réservation — {{logement}}',
      body: `Bonjour {{prenom}},

Merci d'avoir réservé {{logement}} ! Nous sommes ravis de vous accueillir du {{date_arrivee}} au {{date_depart}}.

Pour que votre séjour se passe parfaitement, merci de remplir notre formulaire d'accueil (2 minutes) :
👉 {{tally_url}}

N'hésitez pas à nous contacter si vous avez des questions.

À très vite !`,
    },
    {
      name: 'Rappel formulaire',
      trigger: 'tally_reminder',
      delay_hours: -72,
      subject: 'Rappel — Formulaire d\'accueil à remplir',
      body: `Bonjour {{prenom}},

Votre séjour à {{logement}} approche dans 3 jours et nous n'avons pas encore reçu votre formulaire d'accueil.

Merci de le remplir dès que possible :
👉 {{tally_url}}

Cela nous permet de préparer au mieux votre arrivée.

À très bientôt !`,
    },
    {
      name: 'Séjour bientôt',
      trigger: 'pre_checkin',
      delay_hours: -72,
      subject: 'Votre séjour approche — {{logement}}',
      body: `Bonjour {{prenom}},

Plus que 3 jours avant votre arrivée à {{logement}} ! 🎉

📖 Retrouvez toutes les informations utiles dans votre guide du logement :
{{guide_url}}

🔑 Vous recevrez les codes d'accès le jour de votre arrivée à 15h00.

Check-in : à partir de {{heure_arrivee}} le {{date_arrivee}}
Check-out : avant {{heure_depart}} le {{date_depart}}

À très bientôt !`,
    },
    {
      name: 'Codes d\'accès',
      trigger: 'checkin_codes',
      delay_hours: 0,
      subject: 'Vos codes d\'accès — {{logement}}',
      body: `Bonjour {{prenom}},

Vous pouvez maintenant accéder à {{logement}} !

🔑 Code serrure : {{code_acces}}
📹 Tutoriel serrure : {{video_serrure}}

📖 Guide du logement (wifi, équipements, bonnes adresses…) :
{{guide_url}}

Excellent séjour !`,
    },
    {
      name: 'Lendemain arrivée',
      trigger: 'post_first_night',
      delay_hours: 0,
      subject: 'Tout se passe bien ? — {{logement}}',
      body: `Bonjour {{prenom}},

J'espère que votre première nuit à {{logement}} s'est bien passée !

Tout est à votre goût ? N'hésitez pas à me contacter si vous avez le moindre besoin ou question.

Bon séjour !`,
    },
    {
      name: 'Consignes fin de séjour',
      trigger: 'pre_checkout',
      delay_hours: 0,
      subject: 'Votre départ approche — consignes de fin de séjour',
      body: `Bonjour {{prenom}},

Votre séjour touche à sa fin demain — j'espère que vous avez passé un excellent moment !

Voici les consignes pour la fin de séjour :
- Départ avant {{heure_depart}} le {{date_depart}}
- Merci de laisser le logement propre et rangé
- Fermez bien toutes les fenêtres et la porte
- Laissez les clés / badge à l'emplacement indiqué dans le guide

Merci pour tout !`,
    },
    {
      name: 'Jour du départ',
      trigger: 'checkout_day',
      delay_hours: 0,
      subject: 'Bon retour ! Consignes de départ',
      body: `Bonjour {{prenom}},

C'est le grand jour ! Pensez à quitter le logement avant {{heure_depart}}.

Récapitulatif des consignes :
🗝 Laissez les clés à l'emplacement prévu
🪟 Fermez toutes les fenêtres
🚿 Merci de laisser la salle de bain et la cuisine propres

Merci pour votre séjour à {{logement}} — c'était un plaisir de vous accueillir !`,
    },
    {
      name: 'Demande d\'avis',
      trigger: 'post_checkout',
      delay_hours: 0,
      subject: 'Merci pour votre séjour — et un petit mot ?',
      body: `Bonjour {{prenom}},

J'espère que votre séjour à {{logement}} était parfait !

Si vous avez apprécié votre expérience, un avis sur Airbnb m'aiderait énormément et permettrait à d'autres voyageurs de découvrir le logement 🙏

Merci encore et à bientôt peut-être !`,
    },
  ]

  const insert = db.prepare(`
    INSERT INTO message_templates (property_id, name, trigger, delay_hours, subject, body)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const t of templates) {
    insert.run(propertyId, t.name, t.trigger, t.delay_hours, t.subject, t.body)
  }
}
