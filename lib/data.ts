export type District = { name: string; province: string; position: [number, number]; risk: 'critical'|'warning'|'safe'; population: string; exposed: string; shelters: number; saturation: number; rainfall: number; polygon: [number,number][] };
export const districts: District[] = [
 {name:'Nyabihu',province:'Western',position:[-1.65,29.51],risk:'critical',population:'319,047',exposed:'12,480',shelters:8,saturation:91,rainfall:142,polygon:[[-1.49,29.43],[-1.48,29.59],[-1.67,29.65],[-1.79,29.52],[-1.69,29.39]]},
 {name:'Gakenke',province:'Northern',position:[-1.70,29.80],risk:'critical',population:'365,292',exposed:'8,620',shelters:6,saturation:87,rainfall:128,polygon:[[-1.51,29.65],[-1.54,29.84],[-1.72,29.95],[-1.87,29.79],[-1.76,29.64]]},
 {name:'Rulindo',province:'Northern',position:[-1.76,30.01],risk:'warning',population:'360,144',exposed:'4,210',shelters:5,saturation:74,rainfall:96,polygon:[[-1.60,29.95],[-1.59,30.12],[-1.83,30.17],[-1.92,30.01],[-1.78,29.91]]},
 {name:'Rusizi',province:'Western',position:[-2.49,29.04],risk:'warning',population:'485,529',exposed:'6,340',shelters:7,saturation:78,rainfall:108,polygon:[[-2.32,28.96],[-2.30,29.15],[-2.48,29.24],[-2.65,29.08],[-2.60,28.92]]},
 {name:'Rubavu',province:'Western',position:[-1.70,29.27],risk:'warning',population:'546,683',exposed:'3,560',shelters:4,saturation:72,rainfall:88,polygon:[[-1.57,29.20],[-1.55,29.38],[-1.70,29.41],[-1.83,29.29],[-1.78,29.17]]},
 {name:'Karongi',province:'Western',position:[-2.13,29.40],risk:'safe',population:'373,869',exposed:'1,240',shelters:6,saturation:52,rainfall:54,polygon:[[-1.97,29.31],[-1.99,29.51],[-2.20,29.56],[-2.30,29.39],[-2.18,29.25]]}
];
export const resources = [
 {sector:'Mukamira',district:'Nyabihu',team:'Alpha · Search & rescue',people:24,stock:'1,200 kits',occupied:342,capacity:500,status:'Deployed'},
 {sector:'Gashenyi',district:'Gakenke',team:'Bravo · Medical response',people:18,stock:'850 kits',occupied:218,capacity:350,status:'Deployed'},
 {sector:'Bugarama',district:'Rusizi',team:'Charlie · Flood response',people:16,stock:'640 kits',occupied:126,capacity:400,status:'On standby'},
 {sector:'Base',district:'Rulindo',team:'Delta · Rapid assessment',people:12,stock:'420 kits',occupied:84,capacity:300,status:'En route'}
];
