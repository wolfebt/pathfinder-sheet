import React, { useState, useReducer, createContext, useContext, useMemo, useEffect, useRef } from 'react';

// --- DATA & CONFIGURATION ---
const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

const SKILLS_DATA = [
    { name: "Acrobatics", ability: "DEX" }, { name: "Appraise", ability: "INT" }, { name: "Bluff", ability: "CHA" },
    { name: "Climb", ability: "STR" }, { name: "Craft", ability: "INT", isMultiple: true }, { name: "Diplomacy", ability: "CHA" },
    { name: "Disable Device", ability: "DEX", trainedOnly: true }, { name: "Disguise", ability: "CHA" }, { name: "Escape Artist", ability: "DEX" },
    { name: "Fly", ability: "DEX" }, { name: "Handle Animal", ability: "CHA", trainedOnly: true }, { name: "Heal", ability: "WIS" },
    { name: "Intimidate", ability: "CHA" }, { name: "Know (Arcana)", ability: "INT", trainedOnly: true }, { name: "Know (Dungeoneering)", ability: "INT", trainedOnly: true },
    { name: "Know (Engineering)", ability: "INT", trainedOnly: true }, { name: "Know (Geography)", ability: "INT", trainedOnly: true }, { name: "Know (History)", ability: "INT", trainedOnly: true },
    { name: "Know (Local)", ability: "INT", trainedOnly: true }, { name: "Know (Nature)", ability: "INT", trainedOnly: true }, { name: "Know (Nobility)", ability: "INT", trainedOnly: true },
    { name: "Know (Planes)", ability: "INT", trainedOnly: true }, { name: "Know (Religion)", ability: "INT", trainedOnly: true }, { name: "Linguistics", ability: "INT", trainedOnly: true },
    { name: "Perception", ability: "WIS" }, { name: "Perform", ability: "CHA", isMultiple: true }, { name: "Profession", ability: "WIS", trainedOnly: true, isMultiple: true },
    { name: "Ride", ability: "DEX" }, { name: "Sense Motive", ability: "WIS" }, { name: "Sleight of Hand", ability: "DEX", trainedOnly: true },
    { name: "Spellcraft", ability: "INT", trainedOnly: true }, { name: "Stealth", ability: "DEX" }, { name: "Survival", ability: "WIS" },
    { name: "Swim", ability: "STR" }, { name: "Use Magic Device", ability: "CHA", trainedOnly: true }
];


// --- UTILITY FUNCTIONS ---
const calculateModifier = (score) => Math.floor(((score || 10) - 10) / 2);

const formatModifier = (mod) => (mod >= 0 ? `+${mod}` : mod);

// --- CONTEXT & REDUCER ---
const CharacterContext = createContext();

const initialCharacterState = {
    // Basic Info
    name: '', classLevel: '', race: '', alignment: '', characterLevel: '', height: '', weight: '', description: '', campaign: '',
    // Ability Scores
    abilityScores: {
        STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10,
    },
    tempAbilityScores: {
        STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10,
    },
    // Combat
    hp: { max: 10, current: 10, nonlethal: 0 },
    hitDice: '',
    heroPoints: '',
    initiative: { misc: 0 },
    ac: { armor: 0, shield: 0, natural: 0, deflect: 0, dodge: 0, size: 0 },
    saves: {
        fortitude: { base: 0, magic: 0, misc: 0, temp: 0 },
        reflex: { base: 0, magic: 0, misc: 0, temp: 0 },
        will: { base: 0, magic: 0, misc: 0, temp: 0 },
        conditionalMods: ''
    },
    bab: 0,
    cmb: { misc: 0 },
    cmd: { misc: 0 },
    resistances: { dr: '', sr: ''},
    movement: { walk: 30, swim: '', fly: '', climb: '', burrow: ''},
    weapons: [{ name: '', attack: '', damage: '', critical: '', range: '', type: '', notes: '' }],
    // Skills
    skills: SKILLS_DATA.reduce((acc, skill) => {
        acc[skill.name] = { ranks: 0, misc: 0, isClassSkill: false };
        if (skill.isMultiple) {
            acc[`${skill.name}2`] = { name: '', ranks: 0, misc: 0, isClassSkill: false };
        }
        return acc;
    }, {}),
    // Page 2
    feats: [{ name: '', reference: '' }],
    racialAbilities: [{ name: '', reference: '' }],
    specialAbilities: [{ name: '', level: '', reference: '' }],
    spellcasting: {
        levels: Array(10).fill(null).map((_, i) => ({ level: i, known: '', perDay: '', bonus: '', dc: '' })),
        specialtySchool: '',
        prohibitedSchools: '',
        conditionalMods: ''
    },
     // Page 3
    skillPoints: '',
    characterTraits: '',
    languages: '',
    proficiencies: {
        weapons: { simple: false, martial: false },
        armor: { light: false, medium: false, heavy: false },
        shields: false,
        exotic: ''
    },
    characterHistory: '',
    notes: '',
    // Page 4
    magicalEquipment: [{ item: '', wt: '', location: '' }],
    mundaneEquipment: [{ item: '', description: '', location: '', wt: '' }],
    potionsScrolls: [{ item: '', wt: '' }],
    currency: { pp: 0, gp: 0, sp: 0, cp: 0 },
    armorAndShield: {
        armor1: { type: '', ac: '', maxDex: '', check: '', spellFail: '', donTime: '', wt: '' },
        armor2: { type: '', ac: '', maxDex: '', check: '', spellFail: '', donTime: '', wt: '' },
        shield: { type: '', ac: '', maxDex: '', check: '', spellFail: '', donTime: '', wt: '' },
    },
};

function characterReducer(state, action) {
    switch (action.type) {
        case 'LOAD_STATE':
            // Completely replaces the state with the payload. Useful for loading from a file.
            return { ...action.payload };
        case 'UPDATE_FIELD':
            const { field, value } = action.payload;
            const keys = field.split('.');
            if (keys.length > 1) {
                // Use a deep copy to safely update nested state
                const newNestedState = JSON.parse(JSON.stringify(state));
                let nested = newNestedState;
                for (let i = 0; i < keys.length - 1; i++) {
                    nested = nested[keys[i]];
                }
                nested[keys[keys.length - 1]] = value;
                return newNestedState;
            }
            return { ...state, [field]: value };
        case 'UPDATE_NESTED_FIELD':
            return {
                ...state,
                [action.payload.section]: {
                    ...state[action.payload.section],
                    [action.payload.subSection]: {
                        ...state[action.payload.section][action.payload.subSection],
                        [action.payload.key]: action.payload.value
                    }
                }
            };
        case 'UPDATE_ARRAY_ITEM':
            const newArray = [...state[action.payload.arrayName]];
            newArray[action.payload.index] = { ...newArray[action.payload.index], [action.payload.field]: action.payload.value };
            return { ...state, [action.payload.arrayName]: newArray };
        case 'ADD_ARRAY_ITEM':
            return { ...state, [action.payload.arrayName]: [...state[action.payload.arrayName], action.payload.item] };
        case 'REMOVE_ARRAY_ITEM':
            return { ...state, [action.payload.arrayName]: state[action.payload.arrayName].filter((_, i) => i !== action.payload.index) };
        case 'UPDATE_SPELL_LEVEL':
             const newLevels = [...state.spellcasting.levels];
             newLevels[action.payload.index] = {...newLevels[action.payload.index], [action.payload.field]: action.payload.value};
             return {...state, spellcasting: {...state.spellcasting, levels: newLevels}};
        default:
            return state;
    }
}

// --- UI COMPONENTS ---

const Input = ({ id, label, value, type = 'text', onChange, className = '', vertical=false, readOnly = false, placeholder = '' }) => (
    <div className={`flex ${vertical ? 'flex-col items-start' : 'flex-col items-center'} justify-center ${className}`}>
        <input
            type={type}
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            placeholder={placeholder}
            className="w-full bg-gray-700 border border-gray-500 rounded-md p-1 text-center text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        {label && <label htmlFor={id} className="text-xs uppercase font-bold text-gray-400 mt-1 tracking-wider">{label}</label>}
    </div>
);

const Section = ({ title, children, className = '' }) => (
    <div className={`bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg ${className}`}>
        {title && <h2 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-wider">{title}</h2>}
        {children}
    </div>
);

function CharacterInfo() {
    const { state, dispatch } = useContext(CharacterContext);
    const handleChange = (e) => dispatch({ type: 'UPDATE_FIELD', payload: { field: e.target.name, value: e.target.value } });

    const LabeledInput = ({ name, label }) => (
         <div className="flex flex-col">
            <label htmlFor={name} className="text-sm text-gray-400">{label}</label>
            <input type="text" name={name} value={state[name]} onChange={handleChange} className="bg-transparent border-b-2 border-gray-600 text-white text-lg focus:outline-none focus:border-cyan-400"/>
        </div>
    );
    
    return (
        <Section>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <LabeledInput name="name" label="Character Name"/>
                <LabeledInput name="classLevel" label="Class & Level"/>
                <LabeledInput name="race" label="Race"/>
                <LabeledInput name="characterLevel" label="Character Level"/>
                <LabeledInput name="alignment" label="Alignment"/>
                <LabeledInput name="campaign" label="Campaign"/>
                <LabeledInput name="height" label="Height"/>
                <LabeledInput name="weight" label="Weight"/>
                <div className="flex flex-col md:col-span-2">
                    <label htmlFor="description" className="text-sm text-gray-400">Description</label>
                     <textarea name="description" value={state.description} onChange={handleChange} rows="2" className="bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 mt-1"></textarea>
                </div>
            </div>
        </Section>
    );
}

function AbilityScores() {
    const { state, dispatch } = useContext(CharacterContext);
    
    const tempMods = useMemo(() => ABILITIES.reduce((acc, ability) => {
        acc[ability] = calculateModifier(state.tempAbilityScores[ability]);
        return acc;
    }, {}), [state.tempAbilityScores]);

    const handleScoreChange = (ability, value) => {
        const score = parseInt(value, 10) || 0;
        dispatch({ type: 'UPDATE_FIELD', payload: { field: `abilityScores.${ability}`, value: score } });
        dispatch({ type: 'UPDATE_FIELD', payload: { field: `tempAbilityScores.${ability}`, value: score } });
    };

    const handleTempScoreChange = (ability, value) => {
        dispatch({ type: 'UPDATE_FIELD', payload: { field: `tempAbilityScores.${ability}`, value: parseInt(value, 10) || 0 } });
    };

    return (
        <Section title="Ability Scores">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-6">
                {ABILITIES.map(ability => (
                    <div key={ability} className="bg-gray-900 p-2 rounded-lg text-center border border-gray-700">
                        <h3 className="font-bold text-xl text-white">{ability}</h3>
                        <div className="bg-gray-800 rounded-md p-2 my-2">
                           <span className="text-4xl font-bold text-white">{formatModifier(tempMods[ability])}</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                            <Input id={`abilityScores.${ability}`} label="Score" value={state.abilityScores[ability]} type="number" onChange={(e) => handleScoreChange(ability, e.target.value)} />
                            <Input id={`tempAbilityScores.${ability}`} label="Temp" value={state.tempAbilityScores[ability]} type="number" onChange={(e) => handleTempScoreChange(ability, e.target.value)} />
                        </div>
                    </div>
                ))}
            </div>
        </Section>
    );
}

function CombatStats() {
    const { state, dispatch } = useContext(CharacterContext);
    const { tempAbilityScores, ac, bab, saves, resistances, hp, hitDice, heroPoints, movement, cmb: cmbState, cmd: cmdState } = state;

    const dexMod = calculateModifier(tempAbilityScores.DEX);
    const conMod = calculateModifier(tempAbilityScores.CON);
    const strMod = calculateModifier(tempAbilityScores.STR);
    const wisMod = calculateModifier(tempAbilityScores.WIS);
    const sizeMod = ac.size || 0;

    const totalAc = 10 + (ac.armor || 0) + (ac.shield || 0) + dexMod + sizeMod + (ac.natural || 0) + (ac.deflect || 0) + (ac.dodge || 0);
    
    const fortSave = (saves.fortitude.base || 0) + conMod + (saves.fortitude.magic || 0) + (saves.fortitude.misc || 0) + (saves.fortitude.temp || 0);
    const reflexSave = (saves.reflex.base || 0) + dexMod + (saves.reflex.magic || 0) + (saves.reflex.misc || 0) + (saves.reflex.temp || 0);
    const willSave = (saves.will.base || 0) + wisMod + (saves.will.magic || 0) + (saves.will.misc || 0) + (saves.will.temp || 0);

    const cmbTotal = (bab || 0) + strMod + sizeMod + (cmbState.misc || 0);
    const cmdTotal = 10 + (bab || 0) + strMod + dexMod + sizeMod + (ac.dodge || 0) + (ac.deflect || 0) + (cmdState.misc || 0);
    
    const handleAcChange = (field, value) => dispatch({ type: 'UPDATE_FIELD', payload: { field: `ac.${field}`, value: parseInt(value) || 0 } });
    const handleSaveChange = (save, field, value) => dispatch({ type: 'UPDATE_NESTED_FIELD', payload: { section: 'saves', subSection: save, key: field, value: parseInt(value) || 0 } });
    const handleFieldChange = (field, value) => dispatch({ type: 'UPDATE_FIELD', payload: { field, value } });
    const handleHpChange = (field, value) => dispatch({ type: 'UPDATE_FIELD', payload: { field: `hp.${field}`, value: parseInt(value) || 0 } });

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Health Column */}
            <div className="md:col-span-2 space-y-4">
                 <Section title="Health & Vitals">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <Input id="hp.max" label="Max HP" value={hp.max} onChange={e => handleHpChange('max', e.target.value)} />
                        <Input id="hp.current" label="Current HP" value={hp.current} onChange={e => handleHpChange('current', e.target.value)} />
                        <Input id="hp.nonlethal" label="Nonlethal" value={hp.nonlethal} onChange={e => handleHpChange('nonlethal', e.target.value)} className="col-span-2"/>
                        <Input id="hitDice" label="Hit Dice" value={hitDice} onChange={e => handleFieldChange('hitDice', e.target.value)} />
                        <Input id="heroPoints" label="Hero Points" value={heroPoints} onChange={e => handleFieldChange('heroPoints', e.target.value)} />
                         <Input id="resistances.dr" label="DR" value={resistances.dr} onChange={e => handleFieldChange('resistances.dr', e.target.value)} />
                        <Input id="resistances.sr" label="SR" value={resistances.sr} onChange={e => handleFieldChange('resistances.sr', e.target.value)} />
                    </div>
                </Section>
                <Section title="Initiative">
                    <div className="flex items-center justify-around">
                        <div className="text-center">
                            <span className="text-5xl font-bold">{formatModifier(dexMod + (state.initiative.misc || 0))}</span>
                            <h4 className="text-xs uppercase font-bold text-gray-400 mt-1 tracking-wider">Total</h4>
                        </div>
                        <div className="text-2xl">=</div>
                         <Input id="dexMod" label="Dex Mod" value={formatModifier(dexMod)} readOnly />
                         <div className="text-2xl">+</div>
                        <Input id="initiative.misc" label="Misc" value={state.initiative.misc} onChange={e => handleFieldChange('initiative.misc', e.target.value)} />
                    </div>
                </Section>
            </div>
            
            {/* AC & Movement Column */}
            <div className="md:col-span-3">
                 <Section title="Armor Class">
                     <div className="flex flex-wrap items-center justify-around gap-4">
                        <div className="text-center">
                            <div className="border-2 border-cyan-400 rounded-full w-24 h-24 flex items-center justify-center">
                                <span className="text-4xl font-bold">{totalAc}</span>
                            </div>
                            <h4 className="font-bold uppercase mt-2">Total AC</h4>
                        </div>
                        <div className="text-gray-400 text-2xl font-bold">= 10 +</div>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-center">
                            <Input id="ac.armor" label="Armor" value={ac.armor} onChange={e => handleAcChange('armor', e.target.value)} />
                            <Input id="ac.shield" label="Shield" value={ac.shield} onChange={e => handleAcChange('shield', e.target.value)} />
                            <Input id="ac.dex" label="Dex Mod" value={formatModifier(dexMod)} readOnly />
                            <Input id="ac.size" label="Size" value={ac.size} onChange={e => handleAcChange('size', e.target.value)} />
                            <Input id="ac.natural" label="Natural" value={ac.natural} onChange={e => handleAcChange('natural', e.target.value)} />
                            <Input id="ac.dodge" label="Dodge" value={ac.dodge} onChange={e => handleAcChange('dodge', e.target.value)} />
                        </div>
                    </div>
                </Section>
                 <Section title="Movement" className="mt-4">
                    <div className="grid grid-cols-3 gap-4">
                        <Input id="movement.walk" label="Walk" placeholder="30 ft." value={movement.walk} onChange={(e) => handleFieldChange('movement.walk', e.target.value)} />
                        <Input id="movement.swim" label="Swim" placeholder="ft." value={movement.swim} onChange={(e) => handleFieldChange('movement.swim', e.target.value)} />
                        <Input id="movement.fly" label="Fly" placeholder="ft." value={movement.fly} onChange={(e) => handleFieldChange('movement.fly', e.target.value)} />
                    </div>
                </Section>
            </div>
            
            {/* Saves and Combat Maneuvers */}
            <div className="md:col-span-3 space-y-4">
                 <Section title="Saves" className="flex-grow">
                     <div className="space-y-3">
                        {['fortitude', 'reflex', 'will'].map(save => {
                            const total = save === 'fortitude' ? fortSave : save === 'reflex' ? reflexSave : willSave;
                            const ability = save === 'fortitude' ? 'CON' : save === 'reflex' ? 'DEX' : 'WIS';
                            const abilityMod = calculateModifier(tempAbilityScores[ability]);

                            return (
                                <div key={save} className="bg-gray-900 p-2 rounded-lg flex items-center justify-between flex-wrap">
                                    <h4 className="font-bold uppercase text-white w-28 mb-2 md:mb-0">{save} <span className="text-gray-400">({ability})</span></h4>
                                    <div className="flex items-center space-x-1 flex-wrap">
                                        <div className="text-2xl font-bold bg-gray-700 w-16 text-center py-1 rounded-md">{formatModifier(total)}</div>
                                        <div className="text-lg mx-1">=</div>
                                        <Input className="w-12" id={`saves.${save}.base`} label="Base" value={state.saves[save].base} onChange={e => handleSaveChange(save, 'base', e.target.value)} />
                                        <div className="text-lg">+</div>
                                        <Input className="w-12" id={`saves.${save}.ability`} label="Ability" value={formatModifier(abilityMod)} readOnly />
                                        <div className="text-lg">+</div>
                                        <Input className="w-12" id={`saves.${save}.magic`} label="Magic" value={state.saves[save].magic} onChange={e => handleSaveChange(save, 'magic', e.target.value)} />
                                         <div className="text-lg">+</div>
                                        <Input className="w-12" id={`saves.${save}.misc`} label="Misc" value={state.saves[save].misc} onChange={e => handleSaveChange(save, 'misc', e.target.value)} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                     <textarea name="saves.conditionalMods" value={saves.conditionalMods} onChange={(e) => handleFieldChange('saves.conditionalMods', e.target.value)} placeholder="Conditional Modifiers" rows="1" className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 mt-3"></textarea>
                </Section>
            </div>
             <div className="md:col-span-2 space-y-4">
                 <Section title="Combat">
                    <div className="space-y-4">
                         <Input id="bab" label="Base Attack Bonus" value={bab} onChange={e => handleFieldChange('bab', parseInt(e.target.value) || 0)} />
                        
                        <div className="bg-gray-900 p-2 rounded-lg text-center">
                            <h4 className="text-sm uppercase font-bold text-gray-400 tracking-wider mb-2">Combat Maneuver Bonus (CMB)</h4>
                            <div className="flex items-center justify-center space-x-1">
                                <span className="text-2xl font-bold w-12">{formatModifier(cmbTotal)}</span>
                                <span className="text-lg">=</span>
                                <Input className="w-12" id="cmb.bab" label="BAB" value={bab} readOnly />
                                <span className="text-lg">+</span>
                                <Input className="w-12" id="cmb.str" label="STR" value={formatModifier(strMod)} readOnly />
                                <span className="text-lg">+</span>
                                <Input className="w-12" id="cmb.size" label="Size" value={sizeMod} readOnly />
                                 <span className="text-lg">+</span>
                                <Input className="w-12" id="cmb.misc" label="Misc" value={cmbState.misc} onChange={(e) => handleFieldChange('cmb.misc', parseInt(e.target.value) || 0)} />
                            </div>
                        </div>

                         <div className="bg-gray-900 p-2 rounded-lg text-center">
                            <h4 className="text-sm uppercase font-bold text-gray-400 tracking-wider mb-2">Combat Maneuver Defense (CMD)</h4>
                             <div className="flex items-center justify-center space-x-1">
                                <span className="text-2xl font-bold w-12">{cmdTotal}</span>
                                <span className="text-lg">= 10 +</span>
                                <Input className="w-12" id="cmd.bab" label="BAB" value={bab} readOnly />
                                <span className="text-lg">+</span>
                                <Input className="w-12" id="cmd.str" label="STR" value={formatModifier(strMod)} readOnly />
                                <span className="text-lg">+</span>
                                <Input className="w-12" id="cmd.dex" label="DEX" value={formatModifier(dexMod)} readOnly />
                                <span className="text-lg">+</span>
                                <Input className="w-12" id="cmd.misc" label="Misc" value={cmdState.misc} onChange={(e) => handleFieldChange('cmd.misc', parseInt(e.target.value) || 0)} />
                            </div>
                        </div>
                    </div>
                </Section>
             </div>
        </div>
    );
}

function Weapons() {
    const { state, dispatch } = useContext(CharacterContext);

    const handleWeaponChange = (index, field, value) => {
        dispatch({ type: 'UPDATE_ARRAY_ITEM', payload: { arrayName: 'weapons', index, field, value } });
    };

    const addWeapon = () => {
        dispatch({ type: 'ADD_ARRAY_ITEM', payload: { arrayName: 'weapons', item: { name: '', attack: '', damage: '', critical: '' } } });
    };
    
    const removeWeapon = (index) => {
        dispatch({ type: 'REMOVE_ARRAY_ITEM', payload: { arrayName: 'weapons', index } });
    }

    return (
        <Section title="Weapons & Attacks">
            <div className="space-y-2">
                 <div className="hidden md:grid grid-cols-12 gap-2 text-xs uppercase font-bold text-gray-400">
                    <span className="col-span-3">Weapon</span>
                    <span className="col-span-2">Attack Bonus</span>
                    <span className="col-span-2">Damage</span>
                    <span className="col-span-1">Critical</span>
                    <span className="col-span-3">Notes</span>
                    <span className="col-span-1"></span>
                </div>
                {state.weapons.map((weapon, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <input type="text" placeholder="Weapon Name" className="col-span-1 md:col-span-3 bg-gray-700 p-1 rounded" value={weapon.name} onChange={(e) => handleWeaponChange(index, 'name', e.target.value)} />
                        <input type="text" placeholder="+0" className="col-span-1 md:col-span-2 bg-gray-700 p-1 rounded" value={weapon.attack} onChange={(e) => handleWeaponChange(index, 'attack', e.target.value)} />
                        <input type="text" placeholder="1d8+0" className="col-span-1 md:col-span-2 bg-gray-700 p-1 rounded" value={weapon.damage} onChange={(e) => handleWeaponChange(index, 'damage', e.target.value)} />
                        <input type="text" placeholder="20/x2" className="col-span-1 md:col-span-1 bg-gray-700 p-1 rounded" value={weapon.critical} onChange={(e) => handleWeaponChange(index, 'critical', e.target.value)} />
                        <input type="text" placeholder="Notes" className="col-span-1 md:col-span-3 bg-gray-700 p-1 rounded" value={weapon.notes} onChange={(e) => handleWeaponChange(index, 'notes', e.target.value)} />
                         <button onClick={() => removeWeapon(index)} className="text-red-500 hover:text-red-400 font-bold col-span-1 text-right pr-2">X</button>
                    </div>
                ))}
            </div>
            <button onClick={addWeapon} className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition-colors duration-200">
                Add Weapon
            </button>
        </Section>
    );
}

function Skills() {
    const { state, dispatch } = useContext(CharacterContext);
    const { tempAbilityScores } = state;

    const handleSkillChange = (skillName, field, value) => {
        dispatch({ type: 'UPDATE_NESTED_FIELD', payload: { section: 'skills', subSection: skillName, key: field, value } });
    };
    
    const renderSkillRow = (skill) => {
        const skillState = state.skills[skill.name];
        if (!skillState) return null;
        const abilityMod = calculateModifier(tempAbilityScores[skill.ability]);
        const classSkillBonus = (skillState.isClassSkill && skillState.ranks > 0) ? 3 : 0;
        const total = abilityMod + (skillState.ranks || 0) + (skillState.misc || 0) + classSkillBonus;
        
        return (
             <div key={skill.name} className="grid grid-cols-6 gap-x-2 items-center py-1.5 border-b border-gray-700">
                <div className="col-span-3 flex items-center">
                     <input type="checkbox" className="form-checkbox h-4 w-4 bg-gray-700 border-gray-500 text-cyan-500 mr-2 flex-shrink-0" checked={skillState.isClassSkill} onChange={(e) => handleSkillChange(skill.name, 'isClassSkill', e.target.checked)} />
                    <span className="text-sm text-white truncate">{skill.name}</span>
                    {skill.trainedOnly && <span className="text-xs text-red-400 ml-1">*</span>}
                </div>
                <span className="font-bold text-lg text-white text-center">{formatModifier(total)}</span>
                <span className="text-xs text-gray-400 text-center">
                    {skill.ability} <span className="text-gray-500">({formatModifier(abilityMod)})</span>
                </span>
                <div className="grid grid-cols-2 gap-1">
                    <Input id={`${skill.name}-ranks`} value={skillState.ranks || ''} onChange={(e) => handleSkillChange(skill.name, 'ranks', parseInt(e.target.value) || 0)} placeholder="R" />
                    <Input id={`${skill.name}-misc`} value={skillState.misc || ''} onChange={(e) => handleSkillChange(skill.name, 'misc', parseInt(e.target.value) || 0)} placeholder="M" />
                </div>
            </div>
        );
    };

    const middleIndex = Math.ceil(SKILLS_DATA.length / 2);
    const leftColumnSkills = SKILLS_DATA.slice(0, middleIndex);
    const rightColumnSkills = SKILLS_DATA.slice(middleIndex);

    return (
        <Section title="Skills">
             <div className="grid grid-cols-6 gap-x-2 text-xs uppercase font-bold text-gray-400 mb-2 items-center px-2">
                 <span className="col-span-3">Skill Name</span>
                 <span className="text-center">Total</span>
                 <span className="text-center">Ability</span>
                 <span className="text-center">Ranks/Misc</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                    {leftColumnSkills.map(skill => renderSkillRow(skill))}
                </div>
                 <div>
                    {rightColumnSkills.map(skill => renderSkillRow(skill))}
                </div>
            </div>
        </Section>
    );
}

// --- Page 2 Components ---

function DynamicListSection({ title, arrayName, itemTemplate, columns }) {
    const { state, dispatch } = useContext(CharacterContext);
    const items = state[arrayName];

    const handleChange = (index, field, value) => {
        dispatch({ type: 'UPDATE_ARRAY_ITEM', payload: { arrayName, index, field, value } });
    };

    const addItem = () => {
        dispatch({ type: 'ADD_ARRAY_ITEM', payload: { arrayName, item: itemTemplate } });
    };

    const removeItem = (index) => {
        dispatch({ type: 'REMOVE_ARRAY_ITEM', payload: { arrayName, index } });
    };

    const singularTitle = title.replace(/ies$/, 'y').replace(/s$/, '');

    return (
        <Section title={title}>
            <div className="space-y-2">
                <div className="hidden md:grid grid-cols-8 gap-2 text-xs uppercase font-bold text-gray-400">
                    {columns.map(col => <span key={col.name} className={col.className}>{col.name}</span>)}
                    <span className="col-span-1"></span>
                </div>
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-center">
                        {columns.map(col => (
                            <input
                                key={col.field}
                                type="text"
                                placeholder={col.placeholder}
                                className={`${col.className} bg-gray-700 p-1 rounded w-full`}
                                value={item[col.field]}
                                onChange={(e) => handleChange(index, col.field, e.target.value)}
                            />
                        ))}
                         <button onClick={() => removeItem(index)} className="col-span-1 text-red-500 hover:text-red-400 font-bold text-right pr-2">X</button>
                    </div>
                ))}
            </div>
            <button onClick={addItem} className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition-colors duration-200">
                Add {singularTitle}
            </button>
        </Section>
    );
}

function Spellcasting() {
    const { state, dispatch } = useContext(CharacterContext);
    const { spellcasting } = state;
    
    const handleSpellLevelChange = (index, field, value) => {
        dispatch({type: 'UPDATE_SPELL_LEVEL', payload: { index, field, value }});
    };
    
    const handleFieldChange = (e) => {
         dispatch({ type: 'UPDATE_FIELD', payload: { field: `spellcasting.${e.target.name}`, value: e.target.value } });
    };

    return (
        <Section title="Spellcasting">
             <div className="grid grid-cols-5 text-xs uppercase font-bold text-gray-400 mb-2 items-center text-center">
                <span>Level</span>
                <span>Spells Known</span>
                <span>Spells/Day</span>
                <span>Bonus Spells</span>
                <span>Save DC</span>
            </div>
            <div className="space-y-2">
                {spellcasting.levels.map((level, index) => (
                    <div key={index} className="grid grid-cols-5 gap-x-2 items-center">
                        <div className="bg-gray-900 text-white font-bold text-lg rounded-md p-2 text-center">{index}</div>
                        <Input id={`known-${index}`} value={level.known} onChange={e => handleSpellLevelChange(index, 'known', e.target.value)} />
                        <Input id={`perDay-${index}`} value={level.perDay} onChange={e => handleSpellLevelChange(index, 'perDay', e.target.value)} />
                        <Input id={`bonus-${index}`} value={level.bonus} onChange={e => handleSpellLevelChange(index, 'bonus', e.target.value)} />
                        <Input id={`dc-${index}`} value={level.dc} onChange={e => handleSpellLevelChange(index, 'dc', e.target.value)} />
                    </div>
                ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
                 <input type="text" name="specialtySchool" placeholder="Specialty School / Bloodline" className="w-full bg-gray-700 p-2 rounded" value={spellcasting.specialtySchool} onChange={handleFieldChange} />
                 <input type="text" name="prohibitedSchools" placeholder="Prohibited Schools" className="w-full bg-gray-700 p-2 rounded" value={spellcasting.prohibitedSchools} onChange={handleFieldChange} />
                 <textarea name="conditionalMods" placeholder="Conditional Spell Modifiers" rows="2" className="md:col-span-2 w-full bg-gray-700 p-2 rounded" value={spellcasting.conditionalMods} onChange={handleFieldChange} />
            </div>
        </Section>
    );
}

// --- Page 3 Components ---
function Page3Sections() {
    const { state, dispatch } = useContext(CharacterContext);

    const handleFieldChange = (e) => {
        dispatch({ type: 'UPDATE_FIELD', payload: { field: e.target.name, value: e.target.value } });
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Section title="Character Traits" className="md:col-span-2">
                <textarea name="characterTraits" rows="4" className="w-full bg-gray-700 p-2 rounded" value={state.characterTraits} onChange={handleFieldChange}></textarea>
            </Section>
            <div className="space-y-4">
                 <Section title="Skill Points">
                    <textarea name="skillPoints" rows="1" className="w-full bg-gray-700 p-2 rounded" value={state.skillPoints} onChange={handleFieldChange}></textarea>
                </Section>
                 <Section title="Languages">
                    <textarea name="languages" rows="1" className="w-full bg-gray-700 p-2 rounded" value={state.languages} onChange={handleFieldChange}></textarea>
                </Section>
            </div>
        </div>
    );
}

function ProficienciesSection() {
     const { state, dispatch } = useContext(CharacterContext);
     const handleProficiencyChange = (e) => {
        const { name, checked, type } = e.target;
        const value = type === 'checkbox' ? checked : e.target.value;
        dispatch({ type: 'UPDATE_FIELD', payload: { field: name, value } });
    };

    const ProficiencyCheckbox = ({ name, label }) => {
        const keys = name.split('.');
        let isChecked = state.proficiencies;
        keys.forEach(key => { isChecked = isChecked?.[key] });
        
        return (
            <label className="flex items-center space-x-2 text-white">
                <input
                    type="checkbox"
                    name={`proficiencies.${name}`}
                    checked={!!isChecked}
                    onChange={handleProficiencyChange}
                    className="form-checkbox h-4 w-4 bg-gray-700 border-gray-500 text-cyan-500"
                />
                <span>{label}</span>
            </label>
        );
    };
    
    return (
        <Section title="Proficiencies">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="space-y-2">
                    <h4 className="font-bold text-white">Weapons</h4>
                    <ProficiencyCheckbox name="weapons.simple" label="Simple" />
                    <ProficiencyCheckbox name="weapons.martial" label="Martial" />
                </div>
                <div className="space-y-2">
                     <h4 className="font-bold text-white">Armor</h4>
                    <ProficiencyCheckbox name="armor.light" label="Light" />
                    <ProficiencyCheckbox name="armor.medium" label="Medium" />
                    <ProficiencyCheckbox name="armor.heavy" label="Heavy" />
                </div>
                 <div className="space-y-2">
                    <h4 className="font-bold text-white">Shields</h4>
                    <ProficiencyCheckbox name="shields" label="Shields" />
                </div>
                 <div className="col-span-full">
                     <label className="text-sm text-gray-400">Specific / Exotic</label>
                     <input type="text" name="proficiencies.exotic" className="w-full bg-gray-700 p-2 rounded mt-1" value={state.proficiencies.exotic} onChange={handleProficiencyChange} />
                </div>
            </div>
        </Section>
    );
}

// --- Page 4 Components ---
function Page4Sections() {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <ArmorShieldSection />
                    <DynamicListSection
                        title="Magical Equipment"
                        arrayName="magicalEquipment"
                        itemTemplate={{ item: '', wt: '', location: '' }}
                        columns={[
                            { name: 'Item', field: 'item', placeholder: 'Item Name', className: 'col-span-4' },
                            { name: 'Location', field: 'location', placeholder: 'Location', className: 'col-span-2' },
                            { name: 'Wt.', field: 'wt', placeholder: 'lbs', className: 'col-span-1' },
                        ]}
                    />
                </div>
                <div className="space-y-4">
                    <CurrencySection />
                    <EncumbranceSection />
                </div>
            </div>
             <DynamicListSection
                title="Mundane Equipment, Potions & Scrolls"
                arrayName="mundaneEquipment"
                itemTemplate={{ item: '', description: '', location: '', wt: '' }}
                columns={[
                    { name: 'Item', field: 'item', placeholder: 'Item Name', className: 'col-span-2' },
                    { name: 'Description', field: 'description', placeholder: 'Description', className: 'col-span-3' },
                    { name: 'Location', field: 'location', placeholder: 'Location/Slot', className: 'col-span-1' },
                    { name: 'Wt.', field: 'wt', placeholder: 'lbs', className: 'col-span-1' },
                ]}
            />
        </div>
    );
}

function ArmorShieldSection() {
    const { state, dispatch } = useContext(CharacterContext);
    const { armorAndShield } = state;
    
    const handleChange = (e) => {
        dispatch({ type: 'UPDATE_FIELD', payload: { field: e.target.name, value: e.target.value } });
    }
    
    const ArmorRow = ({ type, label }) => (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-x-2 gap-y-1 items-center">
            <input name={`armorAndShield.${type}.type`} value={armorAndShield[type].type} onChange={handleChange} placeholder={label} className="md:col-span-2 bg-gray-700 p-1 rounded" />
            <Input id={`${type}-ac`} value={armorAndShield[type].ac} onChange={handleChange} name={`armorAndShield.${type}.ac`} />
            <Input id={`${type}-maxDex`} value={armorAndShield[type].maxDex} onChange={handleChange} name={`armorAndShield.${type}.maxDex`} />
            <Input id={`${type}-check`} value={armorAndShield[type].check} onChange={handleChange} name={`armorAndShield.${type}.check`} />
            <Input id={`${type}-spellFail`} value={armorAndShield[type].spellFail} onChange={handleChange} name={`armorAndShield.${type}.spellFail`} />
            <Input id={`${type}-wt`} value={armorAndShield[type].wt} onChange={handleChange} name={`armorAndShield.${type}.wt`} />
        </div>
    );

    return (
        <Section title="Armor & Shield">
            <div className="space-y-2">
                <div className="hidden md:grid grid-cols-7 gap-2 text-xs uppercase font-bold text-gray-400">
                    <span className="col-span-2">Type</span>
                    <span>AC+</span>
                    <span>Max Dex</span>
                    <span>Check</span>
                    <span>Spell Fail</span>
                    <span>Wt.</span>
                </div>
                <ArmorRow type="armor1" label="Armor"/>
                <ArmorRow type="armor2" label="Armor"/>
                <ArmorRow type="shield" label="Shield"/>
            </div>
        </Section>
    );
}

function CurrencySection() {
    const { state, dispatch } = useContext(CharacterContext);
    
    const handleChange = (e) => {
        dispatch({ type: 'UPDATE_FIELD', payload: { field: e.target.name, value: parseInt(e.target.value) || 0 }});
    }

    return (
        <Section title="Currency">
            <div className="grid grid-cols-2 gap-2">
                <Input name="currency.pp" id="currency-pp" label="Platinum" value={state.currency.pp} onChange={handleChange} />
                <Input name="currency.gp" id="currency-gp" label="Gold" value={state.currency.gp} onChange={handleChange} />
                <Input name="currency.sp" id="currency-sp" label="Silver" value={state.currency.sp} onChange={handleChange} />
                <Input name="currency.cp" id="currency-cp" label="Copper" value={state.currency.cp} onChange={handleChange} />
            </div>
        </Section>
    );
}

const CARRYING_CAPACITY_TABLE = {
    1: { light: 3, medium: 6, heavy: 10 }, 2: { light: 6, medium: 13, heavy: 20 }, 3: { light: 10, medium: 20, heavy: 30 },
    4: { light: 13, medium: 26, heavy: 40 }, 5: { light: 16, medium: 33, heavy: 50 }, 6: { light: 20, medium: 40, heavy: 60 },
    7: { light: 23, medium: 46, heavy: 70 }, 8: { light: 26, medium: 53, heavy: 80 }, 9: { light: 30, medium: 60, heavy: 90 },
    10: { light: 33, medium: 66, heavy: 100 }, 11: { light: 38, medium: 76, heavy: 115 }, 12: { light: 43, medium: 86, heavy: 130 },
    13: { light: 50, medium: 100, heavy: 150 }, 14: { light: 58, medium: 116, heavy: 175 }, 15: { light: 66, medium: 133, heavy: 200 },
    16: { light: 76, medium: 153, heavy: 230 }, 17: { light: 86, medium: 173, heavy: 260 }, 18: { light: 100, medium: 200, heavy: 300 },
    19: { light: 116, medium: 233, heavy: 350 }, 20: { light: 133, medium: 266, heavy: 400 }, 21: { light: 153, medium: 306, heavy: 460 },
    22: { light: 173, medium: 346, heavy: 520 }, 23: { light: 200, medium: 400, heavy: 600 }, 24: { light: 233, medium: 466, heavy: 700 },
    25: { light: 266, medium: 533, heavy: 800 }, 26: { light: 306, medium: 613, heavy: 920 }, 27: { light: 346, medium: 693, heavy: 1040 },
    28: { light: 400, medium: 800, heavy: 1200 }, 29: { light: 466, medium: 933, heavy: 1400 },
};

function EncumbranceSection() {
    const { state } = useContext(CharacterContext);
    const str = state.abilityScores.STR;
    const capacity = CARRYING_CAPACITY_TABLE[str] || { light: 0, medium: 0, heavy: 0 };

    const totalWeight = useMemo(() => {
        const armor1Wt = parseFloat(state.armorAndShield.armor1.wt) || 0;
        const armor2Wt = parseFloat(state.armorAndShield.armor2.wt) || 0;
        const shieldWt = parseFloat(state.armorAndShield.shield.wt) || 0;
        const magicalWt = state.magicalEquipment.reduce((sum, item) => sum + (parseFloat(item.wt) || 0), 0);
        const mundaneWt = state.mundaneEquipment.reduce((sum, item) => sum + (parseFloat(item.wt) || 0), 0);
        const potionsWt = state.potionsScrolls.reduce((sum, item) => sum + (parseFloat(item.wt) || 0), 0);
        return armor1Wt + armor2Wt + shieldWt + magicalWt + mundaneWt + potionsWt;
    }, [state]);

    return (
        <Section title="Encumbrance">
            <div className="text-center mb-2">
                <div className="text-xs uppercase font-bold text-gray-400">Current Load</div>
                <div className="text-2xl font-bold">{totalWeight.toFixed(2)} lbs</div>
            </div>
            <div className="grid grid-cols-3 text-center text-sm">
                 <div className="border-r border-gray-600">
                    <div className="font-bold text-white">Light</div>
                    <div>&lt; {capacity.light} lbs</div>
                </div>
                <div className="border-r border-gray-600">
                    <div className="font-bold text-white">Medium</div>
                    <div>{capacity.light}-{capacity.medium} lbs</div>
                </div>
                <div>
                    <div className="font-bold text-white">Heavy</div>
                    <div>{capacity.medium}-{capacity.heavy} lbs</div>
                </div>
            </div>
             <div className="mt-3 text-center">
                <div className="text-xs uppercase font-bold text-gray-400">Feats of Strength</div>
                <div className="text-sm grid grid-cols-2 gap-2 mt-1">
                    <span>Lift Over Head: <strong>{capacity.heavy} lbs</strong></span>
                    <span>Push or Drag: <strong>{capacity.heavy * 5} lbs</strong></span>
                </div>
            </div>
        </Section>
    );
}

// --- MAIN APP COMPONENT ---
export default function App() {
    const [state, dispatch] = useReducer(characterReducer, initialCharacterState);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef();

    useEffect(() => {
        const script1 = document.createElement("script");
        script1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script1.async = true;
        document.body.appendChild(script1);
        
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);


        return () => {
            document.body.removeChild(script1);
            document.removeEventListener("mousedown", handleClickOutside);
        }
    }, []);

    const printDocument = () => {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert("PDF generation library is not loaded yet. Please try again in a moment.");
            return;
        }

        const doc = new jsPDF('p', 'mm', 'a4');
        const margin = 10;
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = margin;

        const addFooter = () => {
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text("Wolfe.BT@TangentLLC", doc.internal.pageSize.getWidth() / 2, pageHeight - 5, { align: 'center' });
        };

        const checkY = (requiredHeight) => {
            if (y + requiredHeight > pageHeight - 15) {
                addFooter();
                doc.addPage();
                y = margin;
                return true; // page was added
            }
            return false;
        };
        
        // --- This is where the programmatic drawing begins ---
        doc.setFontSize(22).setFont(undefined, 'bold');
        doc.text("Pathfinder Character Sheet", doc.internal.pageSize.getWidth() / 2, y, { align: 'center'});
        y += 10;

        // Add character info, abilities, combat, etc.
        // This would be a very large function, drawing each part of the state.
        // For brevity, here is a simplified example of drawing one section.

        checkY(20);
        doc.setFontSize(16).setFont(undefined, 'bold');
        doc.text("Character Information", margin, y);
        y += 6;
        doc.setLineWidth(0.5);
        doc.line(margin, y - 4, doc.internal.pageSize.getWidth() - margin, y - 4);

        doc.setFontSize(10).setFont(undefined, 'normal');
        doc.text(`Name: ${state.name}`, margin, y);
        doc.text(`Class & Level: ${state.classLevel}`, margin + 80, y);
        y+= 6;
        // ... and so on for every single field ...

        addFooter();
        doc.save(`${state.name.replace(/\s/g, '_') || 'pathfinder-character'}.pdf`);
    };
    
    const saveToJson = () => {
        const dataStr = JSON.stringify(state, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `${state.name.replace(/\s/g, '_') || 'pathfinder-character'}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        setMenuOpen(false);
    };

    const loadFromJson = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = readerEvent => {
                try {
                    const newState = JSON.parse(readerEvent.target.result);
                    dispatch({ type: 'LOAD_STATE', payload: newState });
                } catch (error) {
                    alert('Error parsing JSON file. Please ensure it is a valid character sheet file.');
                    console.error("Error parsing JSON:", error);
                }
            }
        }
        input.click();
        setMenuOpen(false);
    };

    const featColumns = [
        { name: 'Feat', field: 'name', placeholder: 'Feat Name', className: 'col-span-3' },
        { name: 'Reference', field: 'reference', placeholder: 'Source/Page', className: 'col-span-4' },
    ];
    
     const racialAbilityColumns = [
        { name: 'Ability', field: 'name', placeholder: 'Ability Name', className: 'col-span-3' },
        { name: 'Reference', field: 'reference', placeholder: 'Source/Page', className: 'col-span-4' },
    ];
    
    const specialAbilityColumns = [
        { name: 'Ability', field: 'name', placeholder: 'Ability Name', className: 'col-span-4' },
        { name: 'Level', field: 'level', placeholder: 'Lvl', className: 'col-span-1' },
        { name: 'Reference', field: 'reference', placeholder: 'Source/Page', className: 'col-span-2' },
    ];

    return (
        <CharacterContext.Provider value={{ state, dispatch }}>
            <div className="bg-gray-900 min-h-screen text-gray-200 font-sans">
                <div id="character-sheet-container" className="p-2 sm:p-4 lg:p-6">
                    <header id="header-for-print" className="flex justify-between items-start my-4 relative">
                       <div ref={menuRef} className="relative">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="border-2 border-cyan-400 text-cyan-400 font-bold py-2 px-4 rounded-lg hover:bg-cyan-400 hover:text-gray-900 transition-colors duration-300">
                                File
                            </button>
                            {menuOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-10">
                                    <div className="py-1">
                                        <h3 className="px-3 py-1 text-xs text-gray-400 uppercase">JSON</h3>
                                        <button onClick={saveToJson} className="w-full text-left px-3 py-1 text-sm text-white hover:bg-gray-700">Save to File</button>
                                        <button onClick={loadFromJson} className="w-full text-left px-3 py-1 text-sm text-white hover:bg-gray-700">Load from File</button>
                                         <div className="border-t border-gray-600 my-1"></div>
                                        <h3 className="px-3 py-1 text-xs text-gray-400 uppercase">Cloud</h3>
                                        <button className="w-full text-left px-3 py-1 text-sm text-gray-500 cursor-not-allowed" disabled>Save to Cloud</button>
                                        <button className="w-full text-left px-3 py-1 text-sm text-gray-500 cursor-not-allowed" disabled>Load from Cloud</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="text-center">
                            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-wider">Pathfinder Character Sheet</h1>
                            <p className="text-cyan-400">A digital folio for your adventures.</p>
                        </div>
                        <button
                            onClick={printDocument}
                            className="border-2 border-cyan-400 text-cyan-400 font-bold py-2 px-4 rounded-lg hover:bg-cyan-400 hover:text-gray-900 transition-colors duration-300"
                        >
                            Print to PDF
                        </button>
                    </header>
                    <div className="max-w-7xl mx-auto space-y-4">
                        <CharacterInfo />
                        <AbilityScores />
                        
                        <div className="space-y-4">
                           <CombatStats />
                           <Weapons />
                           <Skills />
                           <Page3Sections />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <DynamicListSection title="Racial Abilities" arrayName="racialAbilities" itemTemplate={{ name: '', reference: '' }} columns={racialAbilityColumns} />
                                 <DynamicListSection title="Class/Special Abilities" arrayName="specialAbilities" itemTemplate={{ name: '', level:'', reference: '' }} columns={specialAbilityColumns} />
                                <DynamicListSection title="Feats" arrayName="feats" itemTemplate={{ name: '', reference: '' }} columns={featColumns} />
                                <ProficienciesSection />
                            </div>
                            <Spellcasting />
                        </div>
                        
                        <Page4Sections />

                         <Section title="Character History">
                            <textarea name="characterHistory" rows="5" className="w-full bg-gray-700 p-2 rounded" value={state.characterHistory} onChange={(e) => dispatch({type: 'UPDATE_FIELD', payload: {field: 'characterHistory', value: e.target.value}})}></textarea>
                        </Section>

                         <Section title="Notes">
                            <textarea name="notes" rows="5" className="w-full bg-gray-700 p-2 rounded" value={state.notes} onChange={(e) => dispatch({type: 'UPDATE_FIELD', payload: {field: 'notes', value: e.target.value}})}></textarea>
                        </Section>

                    </div>
                </div>
                 <footer className="text-center text-xs text-gray-600 mt-8 pb-4">
                    This character sheet is not published, endorsed, or specifically approved by Paizo Publishing. Based on the Pathfinder system.
                    <div className="text-center text-xs text-gray-500 mt-2">Wolfe.BT@TangentLLC</div>
                </footer>
            </div>
        </CharacterContext.Provider>
    );
}
