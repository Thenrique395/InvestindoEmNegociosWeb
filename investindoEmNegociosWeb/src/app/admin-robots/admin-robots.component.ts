import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRobotsService, RobotExecutionLog, RobotMonitorSummary, RobotStatus } from '../admin-robots.service';
import { UiFeedbackService } from '../ui-feedback.service';

@Component({
  selector: 'app-admin-robots',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-robots.component.html',
  styleUrls: ['./admin-robots.component.scss']
})
export class AdminRobotsComponent implements OnInit {
  loading = false;
  runningAll = false;
  runningRobot: string | null = null;
  robots: RobotStatus[] = [];
  recentRuns: RobotExecutionLog[] = [];
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

  constructor(
    private adminRobots: AdminRobotsService,
    private uiFeedback: UiFeedbackService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.adminRobots.monitor(100).subscribe({
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

  runRobot(robotName: string): void {
    if (!robotName || this.runningRobot || this.runningAll) return;
    this.runningRobot = robotName;
    this.adminRobots.run(robotName).subscribe({
      next: (result) => {
        if (result.success) {
          this.uiFeedback.success(`${result.robotName} executado com sucesso.`);
        } else {
          this.uiFeedback.warning(`${result.robotName} falhou: ${result.error || 'erro desconhecido'}`);
        }
        this.load();
      },
      error: (err) => {
        this.uiFeedback.error(err?.error?.detail || `Falha ao executar ${robotName}.`);
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
    return reasonCode;
  }
}
