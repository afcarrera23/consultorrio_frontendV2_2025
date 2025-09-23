export function esHistoriaVacia(h: any): boolean {
    if (!h) return true;
  
    const hasArr = (x: any) => Array.isArray(x) && x.length > 0;
  
    const hasPat = hasArr(h.antecedentesPatologicos);
    const hasPer = hasArr(h.antecedentesPersonales);
    const hasDx  = hasArr(h.diagnosticos);
  
    const ex = h.examenFisico;
    const hasEx = !!ex && Object.values(ex).some((v: any) => {
      if (v == null) return false;                 // null/undefined
      if (typeof v === 'string') return v.trim() !== '';
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object') return Object.keys(v).length > 0;
      return true;                                  // números/boolean true cuentan como dato
    });
  
    return !(hasPat || hasPer || hasDx || hasEx);
  }
  