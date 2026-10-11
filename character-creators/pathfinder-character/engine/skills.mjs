export const SKILLS = {heal:'wis',survival:'wis',perception:'wis',stealth:'dex',acrobatics:'dex',diplomacy:'cha',fly:'dex',climb:'str',swim:'str',bluff:'cha',disguise:'cha','disable-device':'dex','sleight-of-hand':'dex','handle-animal':'cha',ride:'dex',intimidate:'cha',spellcraft:'int','use-magic-device':'cha','escape-artist':'dex','sense-motive':'wis'};

Object.assign(SKILLS,{appraise:'int',artistry:'int',craft:'int',linguistics:'int',lore:'int',perform:'cha',profession:'wis','tech-use':'int'});
for(const name of ['arcana','dungeoneering','engineering','geography','history','local','nature','nobility','planes','religion'])SKILLS['knowledge-'+name]='int';
