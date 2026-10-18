import type {StylingPreferences} from '../contracts';
export function styleGroupLabel(value:StylingPreferences['presentation']){
 return value==='masculine'?"Men’s styles":value==='feminine'?"Women’s styles":value==='any'?'All styles':'Choose your styles';
}
/** Explicit visitor preference. Never derived from pixels or model landmarks. */
export default function StyleGroupPicker({value,onChange,compact=false}:{value:StylingPreferences['presentation'];onChange:(value:NonNullable<StylingPreferences['presentation']>)=>void;compact?:boolean}){
 return <section className={`style-picker ${compact?'compact':''}`} aria-label="Hairstyle reference preference"><div><span className="eyebrow">YOUR STYLE, YOUR CHOICE</span><h2>{compact?'Hairstyle references':'What looks would you like to explore?'}</h2>{!compact&&<p>Choose your reference group. We don’t infer gender from a photo.</p>}</div><div className="style-segments" role="group" aria-label="Choose hairstyle reference group">{([{id:'masculine',label:'Men’s styles',note:'Crops, tapers & more'},{id:'feminine',label:'Women’s styles',note:'Bobs, layers & more'},{id:'any',label:'All styles',note:'Explore the full catalog'}] as const).map(item=><button type="button" key={item.id} aria-pressed={value===item.id} onClick={()=>onChange(item.id)}><span className="choice-indicator" aria-hidden="true">{value===item.id?'✓':'○'}</span><span><strong>{item.label}</strong>{!compact&&<small>{item.note}</small>}</span></button>)}</div></section>;
}
