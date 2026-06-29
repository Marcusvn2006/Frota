export type Papel = "gestor" | "funcionario";
export type StatusReserva = "pendente" | "aprovada" | "recusada" | "concluida";
export type OrigemReserva = "solicitacao" | "gestor";
export type StatusChecklist = "em_andamento" | "concluido";
export type TipoFoto = "painel_saida" | "painel_chegada" | "cupom";

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          nome: string;
          email: string;
          papel: Papel;
          created_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          papel?: Papel;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>;
        Relationships: [];
      };
      veiculos: {
        Row: {
          id: string;
          modelo: string;
          cor: string;
          placa: string;
          em_manutencao: boolean;
          manutencao_motivo: string | null;
          precisa_atencao: boolean;
        };
        Insert: {
          id?: string;
          modelo: string;
          cor: string;
          placa: string;
          em_manutencao?: boolean;
          manutencao_motivo?: string | null;
          precisa_atencao?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["veiculos"]["Insert"]>;
        Relationships: [];
      };
      reservas: {
        Row: {
          id: string;
          solicitante_id: string;
          veiculo_id: string | null;
          motorista: string;
          inicio: string;
          fim: string;
          status: StatusReserva;
          origem: OrigemReserva;
          created_at: string;
          motivo_recusa: string | null;
          motorista_id: string | null;
        };
        Insert: {
          id?: string;
          solicitante_id: string;
          veiculo_id?: string | null;
          motorista: string;
          inicio: string;
          fim: string;
          status?: StatusReserva;
          origem?: OrigemReserva;
          created_at?: string;
          motivo_recusa?: string | null;
          motorista_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reservas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reservas_solicitante_id_fkey";
            columns: ["solicitante_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservas_veiculo_id_fkey";
            columns: ["veiculo_id"];
            isOneToOne: false;
            referencedRelation: "veiculos";
            referencedColumns: ["id"];
          },
        ];
      };
      reserva_destinos: {
        Row: {
          id: string;
          reserva_id: string;
          destino: string;
          ordem: number;
        };
        Insert: {
          id?: string;
          reserva_id: string;
          destino: string;
          ordem: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["reserva_destinos"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "reserva_destinos_reserva_id_fkey";
            columns: ["reserva_id"];
            isOneToOne: false;
            referencedRelation: "reservas";
            referencedColumns: ["id"];
          },
        ];
      };
      checklists: {
        Row: {
          id: string;
          reserva_id: string;
          km_saida: number | null;
          hora_saida: string | null;
          km_chegada: number | null;
          hora_chegada: string | null;
          abasteceu: boolean;
          litros: number | null;
          valor: number | null;
          status: StatusChecklist;
        };
        Insert: {
          id?: string;
          reserva_id: string;
          km_saida?: number | null;
          hora_saida?: string | null;
          km_chegada?: number | null;
          hora_chegada?: string | null;
          abasteceu?: boolean;
          litros?: number | null;
          valor?: number | null;
          status?: StatusChecklist;
        };
        Update: Partial<Database["public"]["Tables"]["checklists"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "checklists_reserva_id_fkey";
            columns: ["reserva_id"];
            isOneToOne: true;
            referencedRelation: "reservas";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_itens: {
        Row: {
          id: string;
          checklist_id: string;
          item: string;
          ok: boolean;
          obs: string | null;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          item: string;
          ok?: boolean;
          obs?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["checklist_itens"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "checklist_itens_checklist_id_fkey";
            columns: ["checklist_id"];
            isOneToOne: false;
            referencedRelation: "checklists";
            referencedColumns: ["id"];
          },
        ];
      };
      fotos: {
        Row: {
          id: string;
          checklist_id: string;
          veiculo_id: string;
          tipo: TipoFoto;
          url: string;
          tirada_em: string;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          veiculo_id: string;
          tipo: TipoFoto;
          url: string;
          tirada_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fotos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "fotos_checklist_id_fkey";
            columns: ["checklist_id"];
            isOneToOne: false;
            referencedRelation: "checklists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fotos_veiculo_id_fkey";
            columns: ["veiculo_id"];
            isOneToOne: false;
            referencedRelation: "veiculos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      papel: Papel;
      status_reserva: StatusReserva;
      origem_reserva: OrigemReserva;
      status_checklist: StatusChecklist;
      tipo_foto: TipoFoto;
    };
  };
}

// Row type helpers
export type Usuario =
  Database["public"]["Tables"]["usuarios"]["Row"];
export type Veiculo =
  Database["public"]["Tables"]["veiculos"]["Row"];
export type Reserva =
  Database["public"]["Tables"]["reservas"]["Row"];
export type ReservaDestino =
  Database["public"]["Tables"]["reserva_destinos"]["Row"];
export type Checklist =
  Database["public"]["Tables"]["checklists"]["Row"];
export type ChecklistItem =
  Database["public"]["Tables"]["checklist_itens"]["Row"];
export type Foto = Database["public"]["Tables"]["fotos"]["Row"];

// Extended types with relations
export type ReservaComDetalhes = Reserva & {
  solicitante: Pick<Usuario, "id" | "nome" | "email">;
  veiculo?: Pick<Veiculo, "id" | "modelo" | "cor" | "placa"> | null;
  destinos: ReservaDestino[];
};

export type ChecklistComItens = Checklist & {
  itens: ChecklistItem[];
  reserva: ReservaComDetalhes;
};
