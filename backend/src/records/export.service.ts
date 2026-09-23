import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CsvLang, toCsv } from './csv';
import { ListRecordsDto } from './dto/record.dto';
import { ChecklistValue, ChoiceValue, MultiChoiceValue, NumberValue, TextValue } from './record-values';

const L = {
  en: { date: 'Date', reg: 'Registration', brand: 'Brand', model: 'Model', year: 'Year', owner: 'Owner', phone: 'Owner phone', km: 'Mileage (km)',
        gearbox: 'Gearbox', power: 'Motive power', drive: 'Drive mode', by: 'Recorded by', done: 'Done', urgent: 'Urgent', later: 'Later' },
  it: { date: 'Data', reg: 'Targa', brand: 'Marca', model: 'Modello', year: 'Anno', owner: 'Proprietario', phone: 'Telefono proprietario', km: 'Chilometraggio (km)',
        gearbox: 'Cambio', power: 'Alimentazione', drive: 'Trazione', by: 'Registrato da', done: 'Fatto', urgent: 'Urgente', later: 'Rimandato' },
} as const;

const pick = (lang: CsvLang, en: string, it: string | null) => (lang === 'it' && it ? it : en);

/** One column per form field (active or not — history must export), plus the fixed vehicle/visit columns. */
@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService, private readonly vehicles: VehiclesService) {}

  async recordsCsv(filter: ListRecordsDto, lang: CsvLang): Promise<{ csv: string; filename: string }> {
    const t = L[lang];
    const fields = await this.prisma.formField.findMany({
      orderBy: [{ section: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      select: { id: true, labelEn: true, labelIt: true, type: true, config: true, section: { select: { titleEn: true, titleIt: true } } },
    });

    const where: Prisma.ServiceRecordWhereInput = {
      ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
      ...(filter.q ? { vehicle: this.vehicles.searchWhere(filter.q) } : {}),
      ...(filter.from || filter.to
        ? { servicedAt: { ...(filter.from ? { gte: new Date(filter.from) } : {}), ...(filter.to ? { lte: new Date(filter.to) } : {}) } }
        : {}),
    };
    const records = await this.prisma.serviceRecord.findMany({
      where,
      orderBy: { servicedAt: 'desc' },
      select: {
        servicedAt: true, kilometers: true, gearbox: true, motivePower: true, driveMode: true,
        vehicle: { select: { regNumber: true, brand: true, model: true, year: true, ownerName: true, ownerPhone: true } },
        createdBy: { select: { displayName: true } },
        values: { select: { fieldId: true, value: true } },
      },
    });

    const header = [
      t.date, t.reg, t.brand, t.model, t.year, t.owner, t.phone, t.km, t.gearbox, t.power, t.drive, t.by,
      ...fields.map((f) => `${pick(lang, f.section.titleEn, f.section.titleIt)} › ${pick(lang, f.labelEn, f.labelIt)}`),
    ];

    const rows = records.map((r) => {
      const byField = new Map<string, unknown>(r.values.map((v: { fieldId: string; value: unknown }) => [v.fieldId, v.value]));
      return [
        r.servicedAt.toISOString().slice(0, 10),
        r.vehicle.regNumber, r.vehicle.brand, r.vehicle.model, r.vehicle.year,
        r.vehicle.ownerName, r.vehicle.ownerPhone, r.kilometers,
        r.gearbox, r.motivePower, r.driveMode, r.createdBy?.displayName,
        ...fields.map((f) => this.cell(f.type, byField.get(f.id), lang, (f.config as { unit?: string })?.unit)),
      ];
    });

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return { csv: toCsv([header, ...rows], lang), filename: `servicebay-records-${stamp}.csv` };
  }

  private cell(type: string, value: unknown, lang: CsvLang, unit?: string): string {
    if (value == null) return '';
    const t = L[lang];
    switch (type) {
      case 'CHECKLIST': {
        const v = value as ChecklistValue;
        const flags = [v.done && t.done, v.urgent && t.urgent, v.later && t.later].filter(Boolean);
        return [flags.join(', '), v.note].filter(Boolean).join(' — ');
      }
      case 'SINGLE_CHOICE': case 'DROPDOWN': { const v = value as ChoiceValue; return pick(lang, v.labelEn, v.labelIt); }
      case 'MULTI_CHOICE': return (value as MultiChoiceValue).options.map((o) => pick(lang, o.labelEn, o.labelIt)).join(', ');
      case 'NUMBER': { const n = (value as NumberValue).number; return unit ? `${n} ${unit}` : String(n); }
      default: return (value as TextValue).text ?? '';
    }
  }
}
