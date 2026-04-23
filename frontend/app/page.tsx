'use client';

import { Pencil, Check, SquarePen, Trash2, X, ArrowUp, MapPin, Play, ChevronDown, ChevronRight, List } from 'lucide-react';
import { useState, useEffect } from 'react';

interface GameClass { id: number; name: string; iconUrl?: string; }
interface Race { id: number; name: string; availableClasses: GameClass[]; }
interface Skill {
	id: number; name: string; description: string; type: string; iconUrl?: string;
	details: { cost?: string; range?: string; castTime?: string; cooldown?: string; requiredLevel?: string; };
}

interface BuildSkills {
	primaryGeneral: Skill[];
	primarySpecific: Skill[];
	secondaryGeneral: Skill[];
	elite: Skill[];
	linked: Skill[]
}

type RuleDef = { id: string; category: 'filter' | 'sort'; label: string; options: { value: string; label: string }[]; };

const AVAILABLE_RULES: RuleDef[] = [
	{ id: 'cost_filter', category: 'filter', label: 'Coût', options: [{ value: 'with', label: 'Avec coût' }, { value: 'without', label: 'Sans coût' }] },
	{ id: 'cost_sort', category: 'sort', label: 'Tri: Coût', options: [{ value: 'asc', label: 'Moins cher ➔ Plus cher' }, { value: 'desc', label: 'Plus cher ➔ Moins cher' }] },
	{ id: 'passive_filter', category: 'filter', label: 'Passifs', options: [{ value: 'with', label: 'Avec passifs' }, { value: 'exclude', label: 'Sans passifs' }, { value: 'only', label: 'Uniquement passifs' }] },
	{ id: 'instant_filter', category: 'filter', label: 'Instantanés', options: [{ value: 'with', label: 'Avec instantanés' }, { value: 'exclude', label: 'Sans instantanés' }, { value: 'only', label: 'Uniq. instantanés' }] },
	{ id: 'cooldown_sort', category: 'sort', label: 'Tri: Recharge', options: [{ value: 'asc', label: 'Court ➔ Long' }, { value: 'desc', label: 'Long ➔ Court' }] },
];

const ROM_LOCATIONS = [
	"Temple Raksha", "Tombeau des sept héros", "Forteresse de Zurhidon",
	"Hall du Seigneur Démon", "Arène de Warnorken", "Hall des Survivants",
	"Château Sardo", "Forteresse Grafu", "Grotte de la Côte de l'Eau",
	"Abbaye Abandonnée", "Nécropole des Miroirs", "Ruines de la Tour de Glace",
	"Crypte de l'Éternité", "Antre du Cyclope", "Autel Mystique", "Cœur de l'Océan",
	"Grotte du Dragon d'Eau", "Origine",
	"Collines Sabotonnerre", "Steppes de Sascilia", "Montagnes Hurlantes",
	"Vallée d'Aslan", "Hautes-terres d'Ystra", "Canyon des Terres arides",
	"Crête de Croc-Dragon", "Terres de Malice", "Volcan Rouge",
	"Baie de Tergothen", "Côte de l'Opportunité", "Xaviera",
	"Ancien Royaume de Rorazan", "Chrysalia", "Toundra de Merdhin",
	"Passe de Syrbal", "Bassin de Sarlo", "Gorges de Kashaylan",
	"Île des Elfes", "Côte des Lamentations", "Terre Sauvage", "Volcan Mabang"
];

const getCategoryBadgeStyle = (type: string) => {
	if (type.includes('primaryGeneral')) return 'bg-blue-900/30 text-blue-300 border-blue-700/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]';
	if (type.includes('primarySpecific')) return 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50 shadow-[0_0_10px_rgba(99,102,241,0.1)]';
	if (type.includes('linked')) return 'bg-purple-900/30 text-purple-300 border-purple-700/50 shadow-[0_0_10px_rgba(168,85,247,0.1)]';
	if (type.includes('secondaryGeneral')) return 'bg-teal-900/30 text-teal-300 border-teal-700/50 shadow-[0_0_10px_rgba(20,184,166,0.1)]';
	if (type.includes('elite')) return 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50 shadow-[0_0_10px_rgba(234,179,8,0.1)]';
	return 'bg-slate-800 text-slate-300 border-slate-600';
};

const getCategoryLabel = (type: string) => {
	if (type.includes('primaryGeneral')) return 'Générale 1';
	if (type.includes('primarySpecific')) return 'Spécifique';
	if (type.includes('linked')) return 'Liée (Set)';
	if (type.includes('secondaryGeneral')) return 'Générale 2';
	if (type.includes('elite')) return 'Élite';
	return type;
};

export default function Home() {
	const [races, setRaces] = useState<Race[]>([]);
	const [selectedRace, setSelectedRace] = useState<Race | null>(null);
	const [primaryClass, setPrimaryClass] = useState<GameClass | null>(null);
	const [secondaryClass, setSecondaryClass] = useState<GameClass | null>(null);

	const [skills, setSkills] = useState<BuildSkills>({ primaryGeneral: [], primarySpecific: [], secondaryGeneral: [], elite: [], linked: [] });
	const [loadingSkills, setLoadingSkills] = useState(false);

	const [sortLevel, setSortLevel] = useState<'asc' | 'desc'>('asc');
	const [filterCategory, setFilterCategory] = useState<'all' | 'generale' | 'specifique' | 'elite'>('all');
	const [activeRules, setActiveRules] = useState<{ id: string, value: string }[]>([]);

	const [viewMode, setViewMode] = useState<'grouped' | 'mixed'>('grouped');
	const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

	const [isFabOpen, setIsFabOpen] = useState(false);
	const [activeModal, setActiveModal] = useState<'race' | 'primary' | 'secondary' | null>(null);
	const [activeMapModal, setActiveMapModal] = useState<{ url: string, name: string } | null>(null);
	const [showScrollTop, setShowScrollTop] = useState(false);

	const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

	useEffect(() => {
		const loadData = async () => {
			try {
				const res = await fetch(`${process.env.API_URL}/races`);
				const data = await res.json();
				setRaces(data);

				const savedData = localStorage.getItem('rom_build_prefs');
				if (savedData) {
					const prefs = JSON.parse(savedData);

					const race = data.find((r: Race) => r.name === prefs.raceName);
					if (race) {
						setSelectedRace(race);
						if (prefs.primaryClassName) setPrimaryClass(race.availableClasses.find((c: GameClass) => c.name === prefs.primaryClassName) || null);
						if (prefs.secondaryClassName) setSecondaryClass(race.availableClasses.find((c: GameClass) => c.name === prefs.secondaryClassName) || null);
					}

					if (prefs.viewMode) setViewMode(prefs.viewMode);
					if (prefs.sortLevel) setSortLevel(prefs.sortLevel);
					if (prefs.filterCategory) setFilterCategory(prefs.filterCategory);
				}
			} catch (err) { }
		};
		loadData();
	}, []);

	useEffect(() => {
		if (races.length === 0) return;
		const prefs = {
			raceName: selectedRace?.name || null,
			primaryClassName: primaryClass?.name || null,
			secondaryClassName: secondaryClass?.name || null,
			viewMode,
			sortLevel,
			filterCategory
		};
		localStorage.setItem('rom_build_prefs', JSON.stringify(prefs));
	}, [selectedRace, primaryClass, secondaryClass, viewMode, sortLevel, filterCategory, races.length]);

	useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY > 1200) setShowScrollTop(true);
			else setShowScrollTop(false);

			if (isMobileNavOpen) setIsMobileNavOpen(false);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, [isMobileNavOpen]);

	const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

	const scrollToSection = (id: string) => {
		const element = document.getElementById(id);
		if (element) {
			const headerOffset = window.innerWidth < 1024 ? 160 : 180;
			const elementPosition = element.getBoundingClientRect().top;
			const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

			window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
		}
		setIsMobileNavOpen(false);
	};

	useEffect(() => {
		if (!primaryClass) {
			setSkills({ primaryGeneral: [], primarySpecific: [], secondaryGeneral: [], elite: [], linked: [] });
			return;
		}
		const fetchSkills = async () => {
			setLoadingSkills(true);
			try {
				let url = `${process.env.API_URL}/skills/build?primary=${primaryClass.name}`;
				if (secondaryClass) url += `&secondary=${secondaryClass.name}`;
				const res = await fetch(url);
				const data = await res.json();
				setSkills(data);
			} catch (err) { }
			setLoadingSkills(false);
		};
		fetchSkills();
	}, [primaryClass, secondaryClass]);

	const handleReset = () => {
		setSelectedRace(null); setPrimaryClass(null); setSecondaryClass(null);
		setSortLevel('asc'); setFilterCategory('all'); setActiveRules([]);
		setViewMode('grouped'); setCollapsedSections({}); setIsFabOpen(false);
		localStorage.removeItem('rom_build_prefs');
	};

	const toggleSection = (sectionKey: string) => {
		setCollapsedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
	};

	const getInvalidRuleIds = (rules: { id: string, value: string }[]) => {
		const invalidIds = new Set<string>();
		const isCostWithout = rules.some(r => r.id === 'cost_filter' && r.value === 'without');
		const isPassiveOnly = rules.some(r => r.id === 'passive_filter' && r.value === 'only');
		const isInstantOnly = rules.some(r => r.id === 'instant_filter' && r.value === 'only');

		if (isCostWithout) invalidIds.add('cost_sort');
		if (isPassiveOnly) {
			invalidIds.add('instant_filter'); invalidIds.add('cooldown_sort');
			invalidIds.add('cost_filter'); invalidIds.add('cost_sort');
		}
		if (isInstantOnly) invalidIds.add('passive_filter');
		return invalidIds;
	};

	const handleRuleChange = (idx: number, newValue: string) => {
		const newRules = [...activeRules];
		newRules[idx].value = newValue;
		const invalidIds = getInvalidRuleIds(newRules);
		const cleanedRules = newRules.filter(r => !invalidIds.has(r.id) || r.id === newRules[idx].id);
		setActiveRules(cleanedRules);
	};

	const getCostValue = (cost?: string) => {
		if (!cost || cost === '---') return 0;
		const match = cost.match(/\d+/);
		return match ? parseInt(match[0], 10) : 0;
	};

	const getCdValue = (cd?: string) => {
		if (!cd || cd === '---' || cd.toLowerCase().includes('instant')) return 0;
		const str = cd.toLowerCase();
		const valMatch = str.match(/[\d.]+/);
		if (!valMatch) return 0;
		const val = parseFloat(valMatch[0]);
		if (str.includes('m')) return val * 60;
		if (str.includes('h')) return val * 3600;
		return val;
	};

	const processSkills = (skillsArray: Skill[], categoryAlias: string) => {
		if (filterCategory !== 'all' && filterCategory !== categoryAlias) return [];
		let processed = [...skillsArray];

		activeRules.filter(r => AVAILABLE_RULES.find(def => def.id === r.id)?.category === 'filter').forEach(rule => {
			processed = processed.filter(skill => {
				const castTime = skill.details?.castTime?.toLowerCase() || '';
				const costVal = getCostValue(skill.details?.cost);
				const isPassive = castTime.includes('passif');
				const isInstant = castTime.includes('instant');

				if (rule.id === 'cost_filter') {
					if (rule.value === 'with') return costVal > 0;
					if (rule.value === 'without') return costVal === 0;
				}
				if (rule.id === 'passive_filter') {
					if (rule.value === 'exclude') return !isPassive;
					if (rule.value === 'only') return isPassive;
				}
				if (rule.id === 'instant_filter') {
					if (rule.value === 'exclude') return !isInstant;
					if (rule.value === 'only') return isInstant;
				}
				return true;
			});
		});

		processed.sort((a, b) => {
			const levelA = parseInt(a.details?.requiredLevel || '1', 10) || 1;
			const levelB = parseInt(b.details?.requiredLevel || '1', 10) || 1;
			if (sortLevel === 'asc') return levelA - levelB;
			if (sortLevel === 'desc') return levelB - levelA;
			return 0;
		});

		activeRules.filter(r => AVAILABLE_RULES.find(def => def.id === r.id)?.category === 'sort').forEach(rule => {
			processed.sort((a, b) => {
				if (rule.id === 'cost_sort') {
					return rule.value === 'asc' ? getCostValue(a.details?.cost) - getCostValue(b.details?.cost) : getCostValue(b.details?.cost) - getCostValue(a.details?.cost);
				}
				if (rule.id === 'cooldown_sort') {
					return rule.value === 'asc' ? getCdValue(a.details?.cooldown) - getCdValue(b.details?.cooldown) : getCdValue(b.details?.cooldown) - getCdValue(a.details?.cooldown);
				}
				return 0;
			});
		});

		return processed;
	};

	const displayPrimaryGen = processSkills(skills.primaryGeneral, 'generale');
	const displayPrimarySpec = processSkills(skills.primarySpecific, 'specifique');
	const displaySecondaryGen = processSkills(skills.secondaryGeneral, 'generale');
	const displayElite = processSkills(skills.elite, 'elite');
	const displayLinked = processSkills(skills.linked || [], 'linked');

	let allMixedSkills: Skill[] = [];
	if (viewMode === 'mixed') {
		allMixedSkills = [
			...displayPrimaryGen.map(s => ({ ...s, type: 'primaryGeneral' })),
			...displayPrimarySpec.map(s => ({ ...s, type: 'primarySpecific' })),
			...displayLinked.map(s => ({ ...s, type: 'linked' })),
			...displaySecondaryGen.map(s => ({ ...s, type: 'secondaryGeneral' })),
			...displayElite.map(s => ({ ...s, type: 'elite' }))
		];

		allMixedSkills.sort((a, b) => {
			const levelA = parseInt(a.details?.requiredLevel || '1', 10) || 1;
			const levelB = parseInt(b.details?.requiredLevel || '1', 10) || 1;
			return sortLevel === 'asc' ? levelA - levelB : levelB - levelA;
		});

		activeRules.filter(r => AVAILABLE_RULES.find(def => def.id === r.id)?.category === 'sort').forEach(rule => {
			allMixedSkills.sort((a, b) => {
				if (rule.id === 'cost_sort') {
					return rule.value === 'asc' ? getCostValue(a.details?.cost) - getCostValue(b.details?.cost) : getCostValue(b.details?.cost) - getCostValue(a.details?.cost);
				}
				if (rule.id === 'cooldown_sort') {
					return rule.value === 'asc' ? getCdValue(a.details?.cooldown) - getCdValue(b.details?.cooldown) : getCdValue(b.details?.cooldown) - getCdValue(a.details?.cooldown);
				}
				return 0;
			});
		});

		allMixedSkills = Array.from(new Map(allMixedSkills.map(s => [s.id, s])).values());
	}

	const invalidRuleIds = getInvalidRuleIds(activeRules);
	const unselectedRules = AVAILABLE_RULES.filter(def => !activeRules.some(r => r.id === def.id) && !invalidRuleIds.has(def.id));

	const SkillRow = ({ skill, highlightClass }: { skill: Skill, highlightClass?: string }) => {
		const hasSetInfo = skill.description.includes('[Set : ');
		let cleanDescription = skill.description;
		let setLocation = '';

		let detectedMapUrl = "";
		let detectedMapName = "";

		if (hasSetInfo) {
			const parts = skill.description.split('\n\n[Set : ');
			cleanDescription = parts[0];
			setLocation = parts[1] ? parts[1].replace(']', '') : '';

			for (const place of ROM_LOCATIONS) {
				if (setLocation.includes(place)) {
					detectedMapName = place;
					const formattedPlace = place.replace(/ /g, '_');
					detectedMapUrl = `/maps/${formattedPlace}.webp`;
					break;
				}
			}
		}

		return (
			<div className={`flex flex-col gap-3 p-4 border-b border-slate-700/50 hover:bg-slate-800/80 transition-colors ${highlightClass || ''}`}>
				<div className="flex flex-row gap-3 md:gap-4 items-start">
					<div className="flex-shrink-0 mt-0.5">
						{skill.iconUrl ? (
							<img src={skill.iconUrl} alt={skill.name} className="w-10 h-10 md:w-12 md:h-12 rounded shadow-sm border border-slate-600" />
						) : (
							<div className="w-10 h-10 md:w-12 md:h-12 bg-slate-700 rounded border border-slate-600 flex items-center justify-center text-xs text-slate-400">?</div>
						)}
					</div>

					<div className="flex-1 min-w-0 flex flex-col justify-start">
						<h4 className="text-sm md:text-lg font-bold text-white leading-tight">
							{skill.name}
						</h4>
						<div className="mt-1.5 flex gap-2 items-center flex-wrap">
							<span className={`inline-block text-[10px] md:text-xs px-2 py-0.5 rounded-full border ${highlightClass ? 'bg-yellow-900 text-yellow-300 border-yellow-700' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>
								Niv. {skill.details?.requiredLevel || '1'}
							</span>

							{viewMode === 'mixed' && (
								<span className={`inline-block text-[9px] md:text-[10px] px-2 py-0.5 rounded-md border uppercase font-bold tracking-wider ${getCategoryBadgeStyle(skill.type)}`}>
									{getCategoryLabel(skill.type)}
								</span>
							)}
						</div>
					</div>

					<div className="flex flex-col items-end gap-1 text-[11px] md:text-xs text-slate-300 shrink-0 min-w-[90px] md:min-w-[130px]">
						{skill.details?.cost && skill.details.cost !== '---' && (
							<div className="flex justify-between w-full gap-2">
								<span className="text-slate-500 text-left hidden sm:inline">Coût:</span>
								<span className="text-slate-500 text-left sm:hidden">C:</span>
								<span className="font-mono text-blue-300 text-right">{skill.details.cost}</span>
							</div>
						)}
						<div className="flex justify-between w-full gap-2">
							<span className="text-slate-500 text-left hidden sm:inline">Incant:</span>
							<span className="text-slate-500 text-left sm:hidden">I:</span>
							<span className="font-mono text-right">{skill.details?.castTime || 'Passif'}</span>
						</div>
						{skill.details?.cooldown && skill.details.cooldown !== '---' && skill.details.cooldown !== '0s' && (
							<div className="flex justify-between w-full gap-2">
								<span className="text-slate-500 text-left hidden sm:inline">Rech:</span>
								<span className="text-slate-500 text-left sm:hidden">R:</span>
								<span className="font-mono text-yellow-200 text-right">{skill.details.cooldown}</span>
							</div>
						)}
					</div>
				</div>

				<div className="text-[13px] md:text-sm text-slate-400 italic leading-snug pl-0 md:pl-16 flex flex-col gap-3">
					<span style={{ whiteSpace: 'pre-line' }}>{cleanDescription}</span>

					{setLocation && (
						<div className="mt-1 flex items-start gap-2 bg-purple-900/20 border border-purple-700/40 rounded-lg p-3 shadow-sm w-full md:w-fit group relative">
							<MapPin className="text-purple-400 shrink-0 mt-0.5" size={16} />

							<div className="text-purple-200 text-xs md:text-sm not-italic whitespace-pre-line w-full">
								<span className="font-bold text-purple-300 block mb-0.5">Obtention du Set :</span>

								{detectedMapUrl ? (
									<div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-0 mt-1 sm:mt-0">
										<span className="border-b border-dotted border-purple-400 md:cursor-help transition-colors md:hover:text-white md:hover:border-white relative inline-block">
											{setLocation}

											<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden md:group-hover:block z-50 w-80 p-2 bg-slate-950 border border-purple-500/50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-none">
												<div className="relative w-full">
													<img
														src={detectedMapUrl}
														alt={`Carte ${detectedMapName}`}
														className="w-full h-auto rounded-lg border border-slate-700 bg-slate-800 object-cover"
														onError={(e) => {
															const target = e.currentTarget as HTMLImageElement;
															if (target.src.endsWith('.webp')) {
																target.src = target.src.replace('.webp', '.jpg');
															} else {
																target.style.display = 'none';
																target.parentElement?.querySelector('.fallback-msg')?.classList.remove('hidden');
																target.parentElement?.querySelector('.fallback-msg')?.classList.add('flex');
															}
														}}
													/>
													<div className="fallback-msg hidden w-full h-32 items-center justify-center bg-slate-800/80 text-slate-400 italic text-[12px] text-center border border-slate-700 rounded-lg p-4">
														<span>Image introuvable.<br /><br />Ajoutez <strong className="text-purple-300">{detectedMapUrl.split('/').pop()}</strong><br />dans <code className="bg-slate-950 text-slate-300 px-1 py-0.5 rounded border border-slate-700">/public/maps/</code></span>
													</div>
												</div>
												<div className="text-center text-[10px] md:text-xs text-purple-300 mt-2 font-semibold flex items-center justify-center gap-1 uppercase tracking-wider">
													<MapPin size={12} /> Carte : {detectedMapName}
												</div>
												<div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-purple-500/50"></div>
												<div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-slate-950"></div>
											</div>
										</span>

										<button
											onClick={(e) => {
												e.stopPropagation();
												setActiveMapModal({ url: detectedMapUrl, name: detectedMapName });
											}}
											className="md:hidden inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-md border border-purple-400/50 shadow-sm transition-all active:scale-95 w-max"
										>
											<Play size={12} className="fill-white" />
											VOIR LA CARTE
										</button>
									</div>
								) : (
									<span>{setLocation}</span>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		);
	};

	return (
		<main className="min-h-[100dvh] bg-slate-950 text-white p-4 lg:p-8 font-sans pb-28 lg:pb-8 relative">
			<div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

				<div className="hidden lg:block lg:w-1/4">
					<div className="sticky top-8 space-y-6 h-[calc(100vh-4rem)] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

						<div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
							<h2 className="text-xl font-bold text-blue-400 mb-6 pb-4 border-b border-slate-800">Configuration</h2>

							<label className="block text-sm font-semibold text-slate-400 mb-2">1. Race</label>
							<div className="relative mb-6">
								<select
									suppressHydrationWarning
									className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-lg block p-3 outline-none cursor-pointer appearance-none"
									onChange={(e) => {
										const race = races.find(r => r.name === e.target.value);
										setSelectedRace(race || null); setPrimaryClass(null); setSecondaryClass(null);
									}}
									value={selectedRace?.name || ""}
								>
									<option value="" disabled>-- Choisir une race --</option>
									{races.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
								</select>
								<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">▼</div>
							</div>

							{selectedRace && (
								<div className="animate-fadeIn mb-6">
									<label className="block text-sm font-semibold text-slate-400 mb-2">2. Classe Primaire</label>
									<div className="relative">
										<select
											suppressHydrationWarning
											className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-lg block p-3 outline-none cursor-pointer appearance-none"
											onChange={(e) => {
												setPrimaryClass(selectedRace.availableClasses.find(c => c.name === e.target.value) || null);
												setSecondaryClass(null);
											}}
											value={primaryClass?.name || ""}
										>
											<option value="" disabled>-- Choisir la classe 1 --</option>
											{selectedRace.availableClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
										</select>
										<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">▼</div>
									</div>
								</div>
							)}

							{primaryClass && (
								<div className="animate-fadeIn mb-6">
									<label className="block text-sm font-semibold text-slate-400 mb-2">3. Classe Secondaire</label>
									<div className="relative">
										<select
											suppressHydrationWarning
											className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-lg block p-3 outline-none cursor-pointer appearance-none"
											onChange={(e) => setSecondaryClass(selectedRace?.availableClasses.find(c => c.name === e.target.value) || null)}
											value={secondaryClass?.name || ""}
										>
											<option value="">-- Aucune (Monoclasse) --</option>
											{selectedRace?.availableClasses.filter(c => c.name !== primaryClass.name).map(c =>
												<option key={c.id} value={c.name}>{c.name}</option>
											)}
										</select>
										<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">▼</div>
									</div>
								</div>
							)}

							{selectedRace && (
								<div className='animate-fadeIn mt-8 pt-6 border-t border-slate-800'>
									<button onClick={handleReset} className='flex gap-2 items-center justify-center bg-slate-800/50 border border-slate-700 rounded-lg w-full text-sm py-3 hover:bg-red-900/40 hover:text-red-300 transition-all'>
										<Trash2 size={16} /> Réinitialiser le build
									</button>
								</div>
							)}
						</div>

						{primaryClass && viewMode === 'grouped' && (
							<div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl animate-fadeIn">
								<h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
									<List size={18} className="text-blue-400" />
									Navigation Rapide
								</h3>
								<ul className="space-y-3 text-sm font-semibold">
									{displayPrimaryGen.length > 0 && (
										<li onClick={() => scrollToSection('sec-primaryGen')} className="cursor-pointer flex items-center gap-2 text-slate-300 hover:text-blue-400 transition-colors group">
											<span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 group-hover:bg-blue-400 group-hover:scale-125 transition-all"></span> Générales 1
										</li>
									)}
									{displayPrimarySpec.length > 0 && (
										<li onClick={() => scrollToSection('sec-primarySpec')} className="cursor-pointer flex items-center gap-2 text-slate-300 hover:text-indigo-400 transition-colors group">
											<span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 group-hover:bg-indigo-400 group-hover:scale-125 transition-all"></span> Spécifiques
										</li>
									)}
									{displayLinked && displayLinked.length > 0 && (
										<li onClick={() => scrollToSection('sec-linked')} className="cursor-pointer flex items-center gap-2 text-slate-300 hover:text-purple-400 transition-colors group">
											<span className="w-1.5 h-1.5 rounded-full bg-purple-500/50 group-hover:bg-purple-400 group-hover:scale-125 transition-all"></span> Compétences Liées
										</li>
									)}
									{secondaryClass && displaySecondaryGen.length > 0 && (
										<li onClick={() => scrollToSection('sec-secondaryGen')} className="cursor-pointer flex items-center gap-2 text-slate-300 hover:text-teal-400 transition-colors group">
											<span className="w-1.5 h-1.5 rounded-full bg-teal-500/50 group-hover:bg-teal-400 group-hover:scale-125 transition-all"></span> Générales 2
										</li>
									)}
									{secondaryClass && displayElite.length > 0 && (
										<li onClick={() => scrollToSection('sec-elite')} className="cursor-pointer flex items-center gap-2 text-slate-300 hover:text-yellow-400 transition-colors group">
											<span className="w-1.5 h-1.5 rounded-full bg-yellow-500/50 group-hover:bg-yellow-400 group-hover:scale-125 transition-all"></span> Compétences d'Élite
										</li>
									)}
								</ul>
							</div>
						)}

					</div>
				</div>

				<div className="w-full lg:w-3/4">
					{primaryClass ? (
						<div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl relative">

							<div className="p-4 md:p-6 pb-2 md:pb-4 flex items-center gap-3 bg-slate-900 rounded-t-xl">
								{primaryClass.iconUrl && <img src={primaryClass.iconUrl} alt={primaryClass.name} className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-slate-900 border border-slate-600 shadow-lg" />}
								<h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
									{primaryClass.name}
									{secondaryClass && (
										<span className="text-slate-500 flex items-center gap-2">/
											{secondaryClass.iconUrl && <img src={secondaryClass.iconUrl} alt={secondaryClass.name} className="w-6 h-6 md:w-8 md:h-8 rounded-md bg-slate-900 border border-slate-700 shadow opacity-80 hidden sm:block" />}
											{secondaryClass.name}
										</span>
									)}
								</h2>
							</div>

							<div className="sticky top-0 z-30 px-4 pb-4 md:px-6 md:pb-6 pt-2 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 shadow-lg">

								<div className="flex flex-wrap gap-2 md:gap-4 bg-slate-800/60 p-2 md:p-3 rounded-lg border border-slate-700/50">
									<div className="flex items-center gap-2 flex-1 md:flex-none pr-2 md:pr-4 border-r border-slate-700">
										<span className="text-xs md:text-sm font-semibold text-slate-400 hidden sm:inline">Vue:</span>
										<select
											className="w-full bg-slate-900 border border-slate-600 text-white text-[11px] md:text-sm rounded block p-1.5 outline-none cursor-pointer"
											value={viewMode}
											onChange={(e) => setViewMode(e.target.value as any)}
										>
											<option value="grouped">Par Catégorie</option>
											<option value="mixed">Tout Mélangé</option>
										</select>
									</div>

									<div className="flex items-center gap-2 flex-1 md:flex-none">
										<span className="text-xs md:text-sm font-semibold text-slate-400 hidden sm:inline">Catégorie:</span>
										<select
											className="w-full bg-slate-900 border border-slate-600 text-white text-[11px] md:text-sm rounded block p-1.5 outline-none cursor-pointer"
											value={filterCategory}
											onChange={(e) => setFilterCategory(e.target.value as any)}
										>
											<option value="all">Toutes</option>
											<option value="generale">Générales</option>
											<option value="specifique">Spécifiques</option>
											{secondaryClass && (
												<>
													<option value="elite">Élites</option>
													<option value="linked">Liées</option>
												</>
											)}
										</select>
									</div>

									<div className="flex items-center gap-2 flex-1 md:flex-none border-l border-slate-700 pl-2 md:pl-4">
										<span className="text-xs md:text-sm font-semibold text-slate-400 hidden sm:inline">Tri(Niv):</span>
										<select
											className="w-full bg-slate-900 border border-slate-600 text-white text-[11px] md:text-sm rounded block p-1.5 outline-none cursor-pointer"
											value={sortLevel}
											onChange={(e) => setSortLevel(e.target.value as 'asc' | 'desc')}
										>
											<option value="asc">Niv. ▲</option>
											<option value="desc">Niv. ▼</option>
										</select>
									</div>

									{unselectedRules.length > 0 && (
										<div className="flex items-center gap-2 w-full sm:w-auto sm:border-l border-slate-700 sm:pl-2 mt-1 sm:mt-0 ml-auto">
											<select
												className="w-full bg-blue-900/30 text-blue-300 font-bold text-[11px] md:text-sm p-1.5 rounded border border-blue-700/50 hover:bg-blue-900/50 outline-none cursor-pointer text-center"
												value=""
												onChange={(e) => {
													const ruleId = e.target.value;
													const def = AVAILABLE_RULES.find(r => r.id === ruleId);
													if (def) setActiveRules([...activeRules, { id: ruleId, value: def.options[0].value }]);
												}}
											>
												<option value="" disabled>+ Ajouter filtre</option>
												{unselectedRules.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
											</select>
										</div>
									)}
								</div>

								{activeRules.length > 0 && (
									<div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700/50 animate-fadeIn">
										{activeRules.map((rule, idx) => {
											const def = AVAILABLE_RULES.find(r => r.id === rule.id)!;
											return (
												<div key={rule.id} className="flex items-center gap-1.5 bg-slate-950 rounded-md border border-slate-600 px-2 py-1 text-[11px] md:text-xs shadow-sm">
													<span className="text-slate-400 font-semibold">{def.label}:</span>
													<select
														className="bg-transparent text-white font-bold outline-none cursor-pointer appearance-none text-center pr-1"
														value={rule.value}
														onChange={(e) => handleRuleChange(idx, e.target.value)}
													>
														{def.options.map(opt => <option className="bg-slate-900 text-white" key={opt.value} value={opt.value}>{opt.label}</option>)}
													</select>
													<div className="w-px h-3 bg-slate-700 mx-0.5"></div>
													<button onClick={() => setActiveRules(activeRules.filter(r => r.id !== rule.id))} className="text-slate-500 hover:text-red-400 transition-colors">
														<X size={14} />
													</button>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{loadingSkills ? (
								<div className="p-12 text-center text-blue-400 animate-pulse font-semibold">Recherche dans le grimoire...</div>
							) : (
								<div className="flex flex-col pb-8">
									{viewMode === 'mixed' ? (
										<div className="animate-fadeIn">
											{allMixedSkills.length > 0 ? (
												allMixedSkills.map(s => <SkillRow key={`${s.type}-${s.id}`} skill={s} />)
											) : (
												<div className="p-12 text-center text-slate-500 italic flex flex-col items-center gap-4">
													<span className="text-5xl opacity-30">🔍</span>
													<p>Aucune compétence ne correspond à la combinaison de filtres actuels.</p>
													<button onClick={() => { setActiveRules([]); setFilterCategory('all'); }} className="text-blue-400 hover:text-blue-300 underline mt-2">
														Effacer les filtres
													</button>
												</div>
											)}
										</div>
									) : (
										<>
											{displayPrimaryGen.length > 0 && (
												<div id="sec-primaryGen" className="mb-2 animate-fadeIn scroll-mt-[140px] md:scroll-mt-[120px]">
													<div onClick={() => toggleSection('primaryGen')} className="bg-slate-800/80 px-5 py-4 border-y border-slate-700 font-bold text-blue-300 cursor-pointer flex justify-between items-center select-none">
														<span>Générales - {primaryClass.name} <span className="text-xs font-normal opacity-70">({displayPrimaryGen.length})</span></span>
														{collapsedSections['primaryGen'] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
													</div>
													{!collapsedSections['primaryGen'] && displayPrimaryGen.map(s => <SkillRow key={s.id} skill={s} />)}
												</div>
											)}
											{displayPrimarySpec.length > 0 && (
												<div id="sec-primarySpec" className="mb-2 animate-fadeIn scroll-mt-[140px] md:scroll-mt-[120px]">
													<div onClick={() => toggleSection('primarySpec')} className="bg-slate-800/80 px-5 py-4 border-y border-slate-700 font-bold text-indigo-400 cursor-pointer flex justify-between items-center select-none">
														<span>Spécifiques - {primaryClass.name} <span className="text-xs font-normal opacity-70">({displayPrimarySpec.length})</span></span>
														{collapsedSections['primarySpec'] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
													</div>
													{!collapsedSections['primarySpec'] && displayPrimarySpec.map(s => <SkillRow key={s.id} skill={s} />)}
												</div>
											)}
											{displayLinked && displayLinked.length > 0 && (
												<div id="sec-linked" className="mb-2 animate-fadeIn scroll-mt-[140px] md:scroll-mt-[120px]">
													<div onClick={() => toggleSection('linked')} className="bg-purple-900/30 px-5 py-4 border-y border-purple-700/50 font-bold text-purple-400 cursor-pointer flex justify-between items-center select-none">
														<span>Liées - {primaryClass.name} <span className="text-xs font-normal opacity-70">({displayLinked.length})</span></span>
														{collapsedSections['linked'] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
													</div>
													{!collapsedSections['linked'] && displayLinked.map(s => <SkillRow key={s.id} skill={s} highlightClass="bg-purple-900/10" />)}
												</div>
											)}
											{secondaryClass && displaySecondaryGen.length > 0 && (
												<div id="sec-secondaryGen" className="mb-2 animate-fadeIn scroll-mt-[140px] md:scroll-mt-[120px]">
													<div onClick={() => toggleSection('secondaryGen')} className="bg-slate-800/80 px-5 py-4 border-y border-slate-700 font-bold text-teal-400 cursor-pointer flex justify-between items-center select-none">
														<span>Générales - {secondaryClass.name} <span className="text-xs font-normal opacity-70">({displaySecondaryGen.length})</span></span>
														{collapsedSections['secondaryGen'] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
													</div>
													{!collapsedSections['secondaryGen'] && displaySecondaryGen.map(s => <SkillRow key={s.id} skill={s} />)}
												</div>
											)}
											{secondaryClass && displayElite.length > 0 && (
												<div id="sec-elite" className="mb-2 animate-fadeIn scroll-mt-[140px] md:scroll-mt-[120px]">
													<div onClick={() => toggleSection('elite')} className="bg-yellow-900/30 px-5 py-4 border-y border-yellow-700/50 font-bold text-yellow-500 cursor-pointer flex justify-between items-center select-none">
														<span>Élites - {primaryClass.name}/{secondaryClass.name} <span className="text-xs font-normal opacity-70">({displayElite.length})</span></span>
														{collapsedSections['elite'] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
													</div>
													{!collapsedSections['elite'] && displayElite.map(s => <SkillRow key={s.id} skill={s} highlightClass="bg-yellow-900/10" />)}
												</div>
											)}
										</>
									)}
								</div>
							)}
						</div>
					) : (
						<div className="h-[60vh] flex flex-col items-center justify-center text-slate-500 italic p-8 text-center bg-slate-900 rounded-xl border border-slate-800 shadow-inner">
							<span className="text-5xl mb-6 opacity-30"><Pencil /></span>
							<p className="text-lg font-bold">Créez votre build personnalisé</p>
							<p className="text-sm mt-2">Choisissez une race et vos classes pour commencer.</p>
						</div>
					)}
				</div>
			</div>

			<div className="fixed bottom-6 right-4 md:bottom-18 md:right-8 z-40 md:flex flex-col gap-3 items-end">
				<button
					onClick={scrollToTop}
					className={`p-3 md:p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 bg-blue-600 hover:bg-blue-500 border border-blue-400 text-white ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
					title="Remonter en haut"
				>
					<ArrowUp size={24} />
				</button>
			</div>

			{isFabOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsFabOpen(false)} />}
			{isMobileNavOpen && <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setIsMobileNavOpen(false)} />}

			<div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-50 lg:hidden w-full flex justify-center">

				<div className={`absolute flex items-center justify-center transition-all duration-300 ease-out ${isMobileNavOpen ? 'opacity-0 scale-50 pointer-events-none translate-x-0' : (primaryClass && viewMode === 'grouped' && !isFabOpen ? '-translate-x-[36px]' : 'translate-x-0')}`}>
					<div className="relative flex items-center justify-center">
						<button onClick={handleReset} disabled={!selectedRace} className={`absolute w-12 h-12 rounded-full bg-red-600 border-2 border-red-400 text-white shadow-lg flex items-center justify-center transition-all duration-300 ease-out z-40 disabled:opacity-0 disabled:pointer-events-none ${isFabOpen ? '-translate-x-[90px] opacity-100 scale-100' : 'translate-x-0 opacity-0 scale-50 pointer-events-none'}`}>
							<Trash2 size={20} />
						</button>
						<button onClick={() => setActiveModal('primary')} disabled={!selectedRace} className={`absolute w-14 h-14 rounded-full bg-blue-700 border-2 border-blue-400 text-white shadow-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ease-out z-40 disabled:opacity-30 disabled:bg-slate-700 disabled:border-slate-600 ${isFabOpen ? '-translate-x-[80px] -translate-y-[65px] opacity-100 scale-100' : 'translate-x-0 translate-y-0 opacity-0 scale-50 pointer-events-none'}`}>
							Cl. 1
						</button>
						<button onClick={() => setActiveModal('race')} className={`absolute w-14 h-14 rounded-full bg-indigo-700 border-2 border-indigo-400 text-white shadow-lg flex items-center justify-center text-xs font-bold transition-all duration-300 delay-75 ease-out z-40 ${isFabOpen ? '-translate-y-[100px] opacity-100 scale-100' : 'translate-y-0 opacity-0 scale-50 pointer-events-none'}`}>
							Race
						</button>
						<button onClick={() => setActiveModal('secondary')} disabled={!primaryClass} className={`absolute w-14 h-14 rounded-full bg-teal-700 border-2 border-teal-400 text-white shadow-lg flex items-center justify-center text-xs font-bold transition-all duration-300 delay-150 ease-out z-40 disabled:opacity-30 disabled:bg-slate-700 disabled:border-slate-600 ${isFabOpen ? 'translate-x-[80px] -translate-y-[65px] opacity-100 scale-100' : 'translate-x-0 translate-y-0 opacity-0 scale-50 pointer-events-none'}`}>
							Cl. 2
						</button>
						<button onClick={() => { setIsFabOpen(!isFabOpen); setIsMobileNavOpen(false); }} className={`relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-50 shadow-[0_0_20px_rgba(0,0,0,0.5)] ${isFabOpen ? 'bg-green-500 border-green-300 text-white scale-110' : 'bg-slate-800 border-slate-500 text-white hover:scale-105'}`}>
							{isFabOpen ? <Check size={24} /> : <SquarePen size={24} />}
						</button>
					</div>
				</div>

				{primaryClass && viewMode === 'grouped' && (
					<div className={`absolute flex items-center justify-center transition-all duration-300 ease-out ${isFabOpen ? 'opacity-0 scale-50 pointer-events-none translate-x-0' : (isMobileNavOpen ? 'translate-x-0' : 'translate-x-[36px]')}`}>
						<div className="relative flex items-center justify-center">

							{isMobileNavOpen && (
								<div className="absolute bottom-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] p-4 animate-fadeIn z-50 origin-bottom">
									<h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Aller à la section</h3>
									<div className="flex flex-col gap-2">
										{displayPrimaryGen.length > 0 && (<button onClick={() => scrollToSection('sec-primaryGen')} className="w-full text-center px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-blue-300 text-sm font-bold border border-blue-900/30 transition-colors">Générales 1</button>)}
										{displayPrimarySpec.length > 0 && (<button onClick={() => scrollToSection('sec-primarySpec')} className="w-full text-center px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-300 text-sm font-bold border border-indigo-900/30 transition-colors">Spécifiques</button>)}
										{displayLinked && displayLinked.length > 0 && (<button onClick={() => scrollToSection('sec-linked')} className="w-full text-center px-4 py-3 rounded-xl bg-purple-900/30 hover:bg-purple-800/50 text-purple-300 text-sm font-bold border border-purple-900/30 transition-colors">Liées (Set)</button>)}
										{secondaryClass && displaySecondaryGen.length > 0 && (<button onClick={() => scrollToSection('sec-secondaryGen')} className="w-full text-center px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-teal-300 text-sm font-bold border border-teal-900/30 transition-colors">Générales 2</button>)}
										{secondaryClass && displayElite.length > 0 && (<button onClick={() => scrollToSection('sec-elite')} className="w-full text-center px-4 py-3 rounded-xl bg-yellow-900/20 hover:bg-yellow-800/40 text-yellow-300 text-sm font-bold border border-yellow-900/30 transition-colors">Élites</button>)}
									</div>
									<div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-slate-700"></div>
									<div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-slate-900"></div>
								</div>
							)}

							<button
								onClick={() => { setIsMobileNavOpen(!isMobileNavOpen); setIsFabOpen(false); }}
								className={`relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-50 shadow-[0_0_20px_rgba(0,0,0,0.5)] ${isMobileNavOpen ? 'bg-blue-600 border-blue-400 text-white scale-110' : 'bg-slate-800 border-slate-500 text-slate-300'}`}
							>
								{isMobileNavOpen ? <X size={24} /> : <List size={24} />}
							</button>
						</div>
					</div>
				)}
			</div>

			{activeModal && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn" onClick={() => setActiveModal(null)}>
					<div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
						<h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-3 text-center">
							{activeModal === 'race' && 'Choisir une Race'}
							{activeModal === 'primary' && 'Classe Primaire'}
							{activeModal === 'secondary' && 'Classe Secondaire'}
						</h3>
						<div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4">
							{activeModal === 'race' && races.map(r => (
								<button key={r.id} onClick={() => { setSelectedRace(r); setPrimaryClass(null); setSecondaryClass(null); setActiveModal(null); }} className="w-full text-center px-4 py-4 bg-slate-800 hover:bg-indigo-600 rounded-xl text-white font-bold text-lg transition-colors">
									{r.name}
								</button>
							))}
							{activeModal === 'primary' && selectedRace?.availableClasses.map(c => (
								<button key={c.id} onClick={() => { setPrimaryClass(c); setSecondaryClass(null); setActiveModal(null); }} className="w-full flex items-center justify-center gap-4 px-4 py-4 bg-slate-800 hover:bg-blue-600 rounded-xl text-white font-bold text-lg transition-colors">
									{c.iconUrl && <img src={c.iconUrl} alt={c.name} className="w-8 h-8 rounded-md" />} {c.name}
								</button>
							))}
							{activeModal === 'secondary' && (
								<>
									<button onClick={() => { setSecondaryClass(null); setActiveModal(null); }} className="w-full py-4 bg-slate-800/80 hover:bg-red-900/80 rounded-xl text-slate-300 font-semibold italic text-lg transition-colors">
										Aucune (Monoclasse)
									</button>
									{selectedRace?.availableClasses.filter(c => c.name !== primaryClass?.name).map(c => (
										<button key={c.id} onClick={() => { setSecondaryClass(c); setActiveModal(null); }} className="w-full flex items-center justify-center gap-4 px-4 py-4 bg-slate-800 hover:bg-teal-600 rounded-xl text-white font-bold text-lg transition-colors">
											{c.iconUrl && <img src={c.iconUrl} alt={c.name} className="w-8 h-8 rounded-md" />} {c.name}
										</button>
									))}
								</>
							)}
						</div>
						<button onClick={() => setActiveModal(null)} className="mt-6 w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-xl border border-slate-700 transition-colors">Retour au menu</button>
					</div>
				</div>
			)}

			{activeMapModal && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setActiveMapModal(null)}>
					<div className="relative w-full max-w-4xl flex flex-col items-center animate-scaleIn" onClick={(e) => e.stopPropagation()}>
						<button onClick={() => setActiveMapModal(null)} className="absolute -top-12 right-0 text-slate-300 hover:text-red-400 transition-colors" title="Fermer la carte">
							<X size={36} />
						</button>
						<div className="relative w-full flex justify-center">
							<img src={activeMapModal.url} alt={activeMapModal.name} className="w-full h-auto max-h-[80vh] object-contain rounded-xl border-2 border-purple-500/50 bg-slate-900"
								onError={(e) => { const target = e.currentTarget as HTMLImageElement; if (target.src.endsWith('.webp')) target.src = target.src.replace('.webp', '.jpg'); else target.style.display = 'none'; }}
							/>
						</div>
						<div className="mt-4 text-sm md:text-lg font-bold text-purple-200 flex items-center gap-2 bg-slate-900/90 px-6 py-3 rounded-full border border-purple-500/40 shadow-lg backdrop-blur-md">
							<MapPin size={20} className="text-purple-400" /> {activeMapModal.name}
						</div>
					</div>
				</div>
			)}

		</main>
	);
}