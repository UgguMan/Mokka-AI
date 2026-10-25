import {readFileSync} from 'node:fs';
export const taxonomy=JSON.parse(readFileSync(new URL('../../../dataset/metadata/taxonomy.json',import.meta.url),'utf8'));
export const classLabels=taxonomy.map(c=>c.classLabel);
export const byLabel=new Map(taxonomy.map(c=>[c.classLabel,c]));
