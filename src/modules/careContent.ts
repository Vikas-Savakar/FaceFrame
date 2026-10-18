import type { SourceReference } from '../contracts';
export const CARE_REVIEW_DATE='2026-10-18';
export const CARE_SOURCES:Record<string,SourceReference>={
 sunscreen:{id:'aad-sunscreen',title:'How to apply sunscreen',publisher:'American Academy of Dermatology',url:'https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-apply-sunscreen',accessedAt:CARE_REVIEW_DATE},
 spots:{id:'aad-spots',title:'Fade dark spots',publisher:'American Academy of Dermatology',url:'https://www.aad.org/public/everyday-care/skin-care-secrets/routine/fade-dark-spots',accessedAt:CARE_REVIEW_DATE},
 gentle:{id:'aad-gentle',title:'Skin care on a budget',publisher:'American Academy of Dermatology',url:'https://www.aad.org/public/everyday-care/skin-care-basics/care/skin-care-budget',accessedAt:CARE_REVIEW_DATE},
 shade:{id:'aad-shade',title:'Shade, clothing, and sunscreen',publisher:'American Academy of Dermatology',url:'https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen',accessedAt:CARE_REVIEW_DATE},
 jaw:{id:'aao-mewing',title:'Does mewing actually reshape your jaw?',publisher:'American Association of Orthodontists',url:'https://aaoinfo.org/whats-trending/is-mewing-bad-for-you/',accessedAt:CARE_REVIEW_DATE}
};
export const CARE_CARDS=[
 {id:'gentle',title:'Keep the routine gentle',text:'Use a gentle cleanser and a moisturizer that suits your skin. Avoid aggressive scrubbing; stop products that irritate your skin.',source:'gentle'},
 {id:'sunscreen',title:'Protect exposed skin outdoors',text:'Choose broad-spectrum, water-resistant SPF 30 or higher. Apply before going outdoors to uncovered skin, including ears and neck. Reapply every two hours outdoors and immediately after swimming or sweating; follow the label.',source:'sunscreen'},
 {id:'shade',title:'Add shade and clothing',text:'Seek shade and use protective clothing, a wide-brimmed hat and sunglasses. Sunscreen is one part of sun protection.',source:'shade'},
 {id:'spots',title:'When pigmentation concerns persist',text:'Natural skin colour is not a problem to correct. Uneven pigmentation has different causes; this app cannot identify them. Avoid bleach and harsh DIY remedies. Seek a qualified clinician for persistent or concerning changes. No fixed clearing time is promised.',source:'spots'}
] as const;
