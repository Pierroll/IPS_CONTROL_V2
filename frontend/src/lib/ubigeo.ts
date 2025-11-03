// src/lib/ubigeo.ts
import { useMemo, useState } from "react";

export type Department = "Huánuco" | "San Martín";

export type Ubigeo = Record<Department, Record<string, string[]>>;

/**
 * Diccionario oficial (Huánuco y San Martín) -> Provincias -> Distritos
 * Ordenado y listo para selects en cascada.
 */
export const UBIGEO: Ubigeo = {
  "Huánuco": {
    "Ambo": [
      "Ambo","Cayna","Colpas","Conchamarca","Huácar","San Francisco","San Rafael","Tomay Kichwa"
    ],
    "Dos de Mayo": [
      "La Unión","Chuquis","Marías","Pachas","Quivilla","Ripán","Shunqui","Sillapata","Yanas"
    ],
    "Huacaybamba": [
      "Huacaybamba","Canchabamba","Cochabamba","Pinra"
    ],
    "Huamalíes": [
      "Llata","Arancay","Chavín de Pariarca","Jacas Grande","Jircán","Miraflores","Monzón","Punchao","Puños","Singa","Tantamayo"
    ],
    "Huánuco": [
      "Huánuco","Amarilis","Chinchao","Churubamba","Margos","Pillco Marca","Quisqui (Kichki)",
      "San Francisco de Cayrán","San Pedro de Chaulán","Santa María del Valle","Yarumayo","Yacus","San Pablo de Pillao"
    ],
    "Lauricocha": [
      "Jesús","Baños","Jivia","Queropalca","Rondos","San Francisco de Asís","San Miguel de Cauri"
    ],
    "Leoncio Prado": [
      "Rupa-Rupa","Daniel Alomía Robles","Hermilio Valdizán","José Crespo y Castillo","Luyando",
      "Mariano Dámaso Beraún","Pucayacu","Castillo Grande","Pueblo Nuevo","Santo Domingo de Anda"
    ],
    "Marañón": [
      "Huacrachuco","Cholón","La Morada","San Buenaventura","Santa Rosa de Alto Yanajanca"
    ],
    "Pachitea": [
      "Panao","Chaglla","Molino","Umari"
    ],
    "Puerto Inca": [
      "Puerto Inca","Codo del Pozuzo","Honoria","Tournavista","Yuyapichis"
    ],
    "Yarowilca": [
      "Chavinillo","Cáhuac","Chacabamba","Aparicio Pomares","Jacas Chico","Obas","Pampamarca","Choras"
    ],
  },

  "San Martín": {
    "Bellavista": [
      "Bellavista","Alto Biavo","Bajo Biavo","Huallaga","San Pablo","San Rafael"
    ],
    "El Dorado": [
      "San José de Sisa","Agua Blanca","San Martín","Santa Rosa","Shatoja"
    ],
    "Huallaga": [
      "Saposoa","Alto Saposoa","Piscoyacu","Eslabón","Sacanche","Tingo de Saposoa"
    ],
    "Lamas": [
      "Lamas","Alonso de Alvarado","Barranquita","Caynarachi","Cuñumbuqui",
      "Pinto Recodo","Rumisapa","San Roque de Cumbaza","Shanao","Tabalosos","Zapatero"
    ],
    "Mariscal Cáceres": [
      "Juanjuí","Campanilla","Huicungo","Pachiza","Pajarillo"
    ],
    "Moyobamba": [
      "Moyobamba","Calzada","Habana","Jepelacio","Soritor","Yantaló"
    ],
    "Picota": [
      "Picota","Buenos Aires","Caspizapa","Pilluana","Pucacaca",
      "San Cristóbal","San Hilarión","Shamboyacu","Tingo de Ponasa","Tres Unidos"
    ],
    "Rioja": [
      "Rioja","Awajún","Elías Soplin Vargas","Nueva Cajamarca","Pardo Miguel",
      "Pósic","San Fernando","Yorongos","Yuracyacu"
    ],
    "San Martín": [
      "Tarapoto","Alberto Leveau","Cacatachi","Chazuta","Chipurana","El Porvenir","Huimbayoc",
      "Juan Guerra","La Banda de Shilcayo","Morales","Papaplaya","San Antonio","Sauce","Shapaja"
    ],
    "Tocache": [
      "Tocache","Nuevo Progreso","Pólvora","Santa Lucía","Shunté","Uchiza"
    ],
  },
};

// Helpers puros
export const getDepartments = (): Department[] => Object.keys(UBIGEO).sort() as Department[];

export const getProvinces = (department?: string) =>
  department && (UBIGEO as any)[department]
    ? Object.keys((UBIGEO as any)[department]).sort()
    : [];

export const getDistricts = (department?: string, province?: string) =>
  department && province && (UBIGEO as any)[department]?.[province]
    ? ([...(UBIGEO as any)[department][province]] as string[]).sort()
    : [];

/**
 * Hook para selects en cascada (Departamento -> Provincia -> Distrito)
 */
export function useUbigeo(initial?: {
  department?: string;
  province?: string;
  district?: string;
}) {
  const [department, setDepartment] = useState<string>(initial?.department ?? "");
  const [province, setProvince] = useState<string>(initial?.province ?? "");
  const [district, setDistrict] = useState<string>(initial?.district ?? "");

  const departments = useMemo(() => getDepartments(), []);
  const provinces = useMemo(() => getProvinces(department), [department]);
  const districts = useMemo(() => getDistricts(department, province), [department, province]);

  const onDepartmentChange = (d: string) => {
    setDepartment(d);
    setProvince("");
    setDistrict("");
  };
  const onProvinceChange = (p: string) => {
    setProvince(p);
    setDistrict("");
  };

  return {
    department, province, district,
    setDepartment: onDepartmentChange,
    setProvince: onProvinceChange,
    setDistrict,
    departments, provinces, districts,
  };
}
