import {useState} from 'react';
import type {CatalogStyle} from '../contracts';
import {appAssetUrl} from '../modules/assets';
import {referencePreview} from '../modules/referencePreview';
/** Same local-preview/original fallback in the catalog and report shortlist. */
export default function StyleReference({style}:{style:CatalogStyle}){
 const [original,setOriginal]=useState(false),[failed,setFailed]=useState(false);
 return style.referenceImage.status==='ready'&&!failed?<figure className="hair-reference"><img src={appAssetUrl(original?style.referenceImage.value.url:referencePreview(style.referenceImage.value.url))} alt={style.referenceImage.value.alt} loading="lazy" decoding="async" width="768" height="768" onError={()=>original?setFailed(true):setOriginal(true)}/><figcaption>Generated reference · not a try-on</figcaption></figure>:<p role="status">This reference image is unavailable. It is not a preview of you.</p>;
}
