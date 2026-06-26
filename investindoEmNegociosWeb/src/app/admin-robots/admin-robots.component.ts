import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminRobotsService, RobotExecutionLog, RobotMonitorSummary, RobotStatus } from '../admin-robots.service';
import { UiFeedbackService } from '../ui-feedback.service';
import { extractApiErrorMessage } from '../utils/api-error.utils';

@Component({
  selector: 'app-admin-robots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-robots.component.html',
  styleUrls: ['./admin-robots.component.scss']
})
export class AdminRobotsComponent implements OnInit {
  loading = false;
  runningAll = false;
  runningRobot: string | null = null;
  robots: RobotStatus[] = [];
  recentRuns: RobotExecutionLog[] = [];
  selectedRun: RobotExecutionLog | null = null;
  summary24h: RobotMonitorSummary = {
    totalRuns: 0,
    successRuns: 0,
    failedRuns: 0,
    successRatePercent: 0,
    itemsGenerated: 0,
    emailsAttempted: 0,
    emailsSent: 0,
    emailsFailed: 0
  };

  filters = {
    robotName: '',
    status: 'all' as 'all' | 'success' | 'failed',
    from: '',
    to: '',
    search: ''
  };

  forceRun = false;
  cooldownMinutes = 10;

  constructor(
    private adminRobots: AdminRobotsService,
    private uiFeedback: UiFeedbackService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const success = this.filters.status === 'all' ? null : this.filters.status === 'success';
    this.adminRobots.monitor({
      take: 100,
      robotName: this.filters.robotName.trim() || undefined,
      success,
      from: this.filters.from || undefined,
      to: this.filters.to || undefined,
      search: this.filters.search.trim() || undefined
    }).subscribe({
      next: (response) => {
        this.summary24h = response.summary24h || this.summary24h;
        this.robots = response.robots || [];
        this.recentRuns = response.recentRuns || [];
      },
      error: () => {
        this.uiFeedback.error('Não foi possível carregar o monitor de robôs.');
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  clearFilters(): void {
    this.filters = {
      robotName: '',
      status: 'all',
      from: '',
      to: '',
      search: ''
    };
    this.load();
  }

  runRobot(robotName: string): void {
    if (!robotName || this.runningRobot || this.runningAll) return;
    this.runningRobot = robotName;
    this.adminRobots.run(robotName, {
      force: this.forceRun,
      cooldownMinutes: this.cooldownMinutes
    }).subscribe({
      next: (result) => {
        if (result.wasSkipped) {
          this.uiFeedback.info(`${result.robotName} pulado por segurança (${result.skipReason || 'janela recente'}).`);
        } else if (result.success) {
          this.uiFeedback.success(`${result.robotName} executado com sucesso.`);
        } else {
          this.uiFeedback.warning(`${result.robotName} falhou: ${result.error || 'erro desconhecido'}`);
        }
        this.load();
      },
      error: (err) => {
        this.uiFeedback.error(extractApiErrorMessage(err, `Falha ao executar ${robotName}.`));
      },
      complete: () => {
        this.runningRobot = null;
      }
    });
  }

  runAll(): void {
    if (this.runningAll || this.runningRobot) return;
    this.runningAll = true;
    this.adminRobots.runAll().subscribe({
      next: (results) => {
        const ok = (results || []).filter((x) => x.success).length;
        const fail = (results || []).length - ok;
        this.uiFeedback.info(`Execução concluída. Sucesso: ${ok}. Falhas: ${fail}.`);
        this.load();
      },
      error: () => {
        this.uiFeedback.error('Falha ao executar todos os robôs.');
      },
      complete: () => {
        this.runningAll = false;
      }
    });
  }

  openRunDetails(run: RobotExecutionLog): void {
    this.selectedRun = run;
  }

  closeRunDetails(): void {
    this.selectedRun = null;
  }

  statusLabel(value: boolean | null): string {
    if (value === null) return 'Nunca executado';
    return value ? 'Sucesso' : 'Falha';
  }

  processedCountHint(count: number): string {
    if (count > 0) return `${count} item(ns) processado(s) nesta execução.`;
    return 'Nenhum item novo para processar nesta execução.';
  }

  zeroItemsReasonLabel(reasonCode: string | null): string {
    if (!reasonCode) return 'Sem motivo específico.';
    if (reasonCode === 'NO_USERS') return 'Sem usuários cadastrados.';
    if (reasonCode === 'NO_ACTIVE_USERS') return 'Sem usuários ativos.';
    if (reasonCode === 'NO_NEW_NOTIFICATIONS') return 'Sem novos eventos elegíveis para gerar notificações.';
    if (reasonCode === 'SKIPPED_SAFETY_WINDOW') return 'Execução pulada por janela de segurança anti-duplicidade.';
    return reasonCode;
  }
}
