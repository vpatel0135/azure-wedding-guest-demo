/* Synthetic portfolio data. No record in this file describes a real person or event. */
const guestData = {
  wedding: { coupleNames: "Avery & Jordan", primaryDate: "2027-06-12", hashtag: "#EverAfterDemo" },
  photoGroups: [
    { title: "Wedding Party", names: ["Alex Morgan", "Casey Brooks", "Taylor Reed", "Riley Lane"] },
    { title: "College Friends", names: ["Jamie Park", "Cameron Stone", "Morgan Lee"] },
    { title: "Family", names: ["Robin Hart", "Sam Hart", "Drew Quinn", "Skyler Quinn"] }
  ],
  seatingTables: [
    { number: 1, guests: ["Alex Morgan", "Casey Brooks", "Taylor Reed"] },
    { number: 2, guests: ["Jamie Park", "Cameron Stone", "Morgan Lee"] },
    { number: 3, guests: ["Robin Hart", "Sam Hart", "Drew Quinn", "Skyler Quinn"] }
  ],
  venues: [
    { id: "venue_garden", name: "Demo Garden Pavilion", address: "100 Example Way, Sample City, NY 10001", mapLinkable: false },
    { id: "venue_hall", name: "Demo Skyline Hall", address: "200 Example Avenue, Sample City, NY 10001", mapLinkable: false },
    { id: "venue_hotel", name: "Demo Harbor Hotel", address: "300 Example Plaza, Sample City, NY 10001", mapLinkable: false }
  ],
  events: [
    { id: "event_mehndi", title: "Mehndi", date: "2027-06-10", startTime: "2027-06-10T18:00:00-04:00", endTime: "2027-06-10T21:00:00-04:00", venueId: "venue_garden", lens: null },
    { id: "event_vidhi", title: "Vidhi", date: "2027-06-11", startTime: "2027-06-11T10:00:00-04:00", endTime: "2027-06-11T12:30:00-04:00", venueId: "venue_garden", lens: null },
    { id: "event_sangeet", title: "Sangeet & Garba", date: "2027-06-11", startTime: "2027-06-11T18:30:00-04:00", endTime: "2027-06-11T22:30:00-04:00", venueId: "venue_hall", lens: null },
    { id: "event_wedding", title: "Hindu Wedding Ceremony", date: "2027-06-12", startTime: "2027-06-12T15:00:00-04:00", endTime: "2027-06-12T17:30:00-04:00", venueId: "venue_garden", lens: null },
    { id: "event_reception", title: "Wedding Reception", date: "2027-06-12", startTime: "2027-06-12T19:00:00-04:00", endTime: "2027-06-12T23:00:00-04:00", venueId: "venue_hall", lens: null },
    { id: "event_farewell", title: "Farewell Brunch", date: "2027-06-13", startTime: "2027-06-13T10:00:00-04:00", endTime: "2027-06-13T12:00:00-04:00", venueId: "venue_hotel", lens: null }
  ],
  timelineItems: [
    { id: "welcome_arrival", eventId: "event_mehndi", time: "2027-06-10T18:00:00-04:00", title: "Guest arrival", guestTitle: "Welcome & refreshments", rollupParentId: null, sourceTimeLabel: "6:00 PM", guestSubMoments: null },
    { id: "welcome_dinner", eventId: "event_mehndi", time: "2027-06-10T19:00:00-04:00", title: "Dinner", guestTitle: "Dinner stations open", rollupParentId: null, sourceTimeLabel: "7:00 PM", guestSubMoments: null },
    { id: "vidhi_one", eventId: "event_vidhi", time: "2027-06-11T10:00:00-04:00", title: "Partner One's Side — Family welcome", guestTitle: "Partner One's Side — Family welcome", rollupParentId: null, sourceTimeLabel: "10:00 AM", guestSubMoments: null },
    { id: "vidhi_two", eventId: "event_vidhi", time: "2027-06-11T10:00:00-04:00", title: "Partner Two's Side — Family welcome", guestTitle: "Partner Two's Side — Family welcome", rollupParentId: null, sourceTimeLabel: "10:00 AM", guestSubMoments: null },
    { id: "vidhi_merge", eventId: "event_vidhi", time: "2027-06-11T11:15:00-04:00", title: "Families come together", guestTitle: "Families come together", rollupParentId: null, sourceTimeLabel: "11:15 AM", guestSubMoments: null },
    { id: "sangeet_open", eventId: "event_sangeet", time: "2027-06-11T18:30:00-04:00", title: "Doors open", guestTitle: "Doors open", rollupParentId: null, sourceTimeLabel: "6:30 PM", guestSubMoments: null },
    { id: "sangeet_show", eventId: "event_sangeet", time: "2027-06-11T20:00:00-04:00", title: "Performances", guestTitle: "Music and dance performances", rollupParentId: null, sourceTimeLabel: "8:00 PM", guestSubMoments: ["Family performances", "Friends' showcase", "Open dance floor"] },
    { id: "wedding_arrival", eventId: "event_wedding", time: "2027-06-12T14:30:00-04:00", title: "Guest arrival", guestTitle: "Guest arrival", rollupParentId: null, sourceTimeLabel: "2:30 PM", guestSubMoments: null },
    { id: "wedding_ceremony", eventId: "event_wedding", time: "2027-06-12T15:00:00-04:00", title: "Ceremony", guestTitle: "Wedding ceremony", rollupParentId: null, sourceTimeLabel: "3:00 PM", guestSubMoments: ["Processional", "Ceremony", "Recessional"] },
    { id: "reception_cocktails", eventId: "event_reception", time: "2027-06-12T19:00:00-04:00", title: "Cocktail hour", guestTitle: "Cocktail hour", rollupParentId: null, sourceTimeLabel: "7:00 PM", guestSubMoments: null },
    { id: "reception_dinner", eventId: "event_reception", time: "2027-06-12T20:00:00-04:00", title: "Dinner", guestTitle: "Dinner & toasts", rollupParentId: null, sourceTimeLabel: "8:00 PM", guestSubMoments: null },
    { id: "brunch", eventId: "event_farewell", time: "2027-06-13T10:00:00-04:00", title: "Brunch", guestTitle: "Farewell brunch", rollupParentId: null, sourceTimeLabel: "10:00 AM", guestSubMoments: null }
  ],
  transportation: [
    { id: "shuttle_reception", eventId: "event_reception", pickupVenueId: "venue_hotel", destinationVenueId: "venue_hall", departureTime: "2027-06-12T18:30:00-04:00", arrivalTime: "2027-06-12T18:50:00-04:00", guestInstructions: "Demo shuttle departs from the hotel lobby.", lifecycle: "confirmed" }
  ]
};
