export type Papel = "gestor" | "funcionario";
export type StatusReserva = "pendente" | "aprovada" | "recusada" | "concluida";
export type OrigemReserva = "solicitacao" | "gestor";
export type StatusChecklist = "em_andamento" | "concluido";
export type TipoFoto = "painel_saida" | "painel_chegada" | "cupom";
export type EntidadeVencimento = "veiculo" | "motorista";
export type TipoVencimento =
  | "cnh"
  | "ipva"
  | "licenciamento"
  | "revisao"
  | "seguro";

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
          ipva_validade: string | null;
          licenciamento_validade: string | null;
          revisao_validade: string | null;
          seguro_validade: string | null;
        };
        Insert: {
          id?: string;
          modelo: string;
          cor: string;
          placa: string;
          em_manutencao?: boolean;
          manutencao_motivo?: string | null;
          precisa_atencao?: boolean;
          ipva_validade?: string | null;
          licenciamento_validade?: string | null;
          revisao_validade?: string | null;
          seguro_validade?: string | null;
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
          {
            foreignKeyName: "reservas_motorista_id_fkey";
            columns: ["motorista_id"];
            isOneToOne: false;
            referencedRelation: "motoristas";
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
          created_at: string;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          veiculo_id: string;
          tipo: TipoFoto;
          url: string;
          tirada_em?: string;
          created_at?: string;
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
      empresas: {
        Row: {
          id: string;
          nome: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["empresas"]["Insert"]>;
        Relationships: [];
      };
      motoristas: {
        Row: {
          id: string;
          empresa_id: string;
          nome: string;
          cnh_numero: string | null;
          cnh_categoria: string | null;
          cnh_validade: string | null;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          nome: string;
          cnh_numero?: string | null;
          cnh_categoria?: string | null;
          cnh_validade?: string | null;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["motoristas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "motoristas_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "motoristas_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      vencimentos: {
        Row: {
          id: string;
          empresa_id: string;
          entidade_tipo: EntidadeVencimento;
          entidade_id: string;
          tipo: TipoVencimento;
          data_vencimento: string;
          resolvido: boolean;
          observacao: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          entidade_tipo: EntidadeVencimento;
          entidade_id: string;
          tipo: TipoVencimento;
          data_vencimento: string;
          resolvido?: boolean;
          observacao?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vencimentos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "vencimentos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      alertas_enviados: {
        Row: {
          id: string;
          vencimento_id: string;
          dias_antes: number;
          enviado_em: string;
        };
        Insert: {
          id?: string;
          vencimento_id: string;
          dias_antes: number;
          enviado_em?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["alertas_enviados"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "alertas_enviados_vencimento_id_fkey";
            columns: ["vencimento_id"];
            isOneToOne: false;
            referencedRelation: "vencimentos";
            referencedColumns: ["id"];
          },
        ];
      };
      multas: {
        Row: {
          id: string;
          empresa_id: string;
          veiculo_id: string;
          motorista_id: string | null;
          data_infracao: string;
          hora_infracao: string;
          valor: number;
          descricao: string;
          prazo_pagamento: string | null;
          resolvida: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          veiculo_id: string;
          motorista_id?: string | null;
          data_infracao: string;
          hora_infracao: string;
          valor: number;
          descricao: string;
          prazo_pagamento?: string | null;
          resolvida?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["multas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "multas_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "multas_veiculo_id_fkey";
            columns: ["veiculo_id"];
            isOneToOne: false;
            referencedRelation: "veiculos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "multas_motorista_id_fkey";
            columns: ["motorista_id"];
            isOneToOne: false;
            referencedRelation: "motoristas";
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
      entidade_vencimento: EntidadeVencimento;
      tipo_vencimento: TipoVencimento;
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
export type Empresa = Database["public"]["Tables"]["empresas"]["Row"];
export type Motorista =
  Database["public"]["Tables"]["motoristas"]["Row"];
export type Vencimento =
  Database["public"]["Tables"]["vencimentos"]["Row"];
export type AlertaEnviado =
  Database["public"]["Tables"]["alertas_enviados"]["Row"];
export type Multa = Database["public"]["Tables"]["multas"]["Row"];

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
