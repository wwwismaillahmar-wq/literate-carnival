import 'server-only';
import { serverLocale } from './content.server';
import ar from '../../../dictionaries/ar.json';
import en from '../../../dictionaries/en.json';
import fr from '../../../dictionaries/fr.json';
import es from '../../../dictionaries/es.json';
import de from '../../../dictionaries/de.json';
import pt from '../../../dictionaries/pt.json';
const dictionaries={ar,en,fr,es,de,pt};
type Section='academy'|'admin'|'services';
export async function getPortalDictionary(section:Section){
 const locale=await serverLocale();
 return (key:string)=>dictionaries[locale][section][key as keyof typeof dictionaries['ar'][Section]] || dictionaries.en[section][key as keyof typeof dictionaries['en'][Section]] || key;
}
