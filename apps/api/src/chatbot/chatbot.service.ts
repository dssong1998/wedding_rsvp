import type { MessageEvent } from "@nestjs/common";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Subject, filter, interval, map, merge, of } from "rxjs";
import { NotifyService } from "../notify/notify.service";

export type ChatbotTicket = {
  id: string;
  sessionId: string;
  question: string;
  inviteName: string | null;
  status: "pending" | "answered";
  response: string | null;
  createdAt: string;
  answeredAt: string | null;
};

type ChatbotEvent =
  | {
      type: "ticket_created";
      ticket: ChatbotTicket;
    }
  | {
      type: "ticket_answered";
      ticket: ChatbotTicket;
    }
  | {
      type: "admin_response";
      sessionId: string;
      ticketId: string;
      message: string;
      answeredAt: string;
    };

@Injectable()
export class ChatbotService {
  private readonly ticketsById = new Map<string, ChatbotTicket>();
  private readonly ticketOrder: string[] = [];
  private readonly stream$ = new Subject<ChatbotEvent>();
  private readonly maxTicketCount = 300;

  constructor(private readonly notifyService: NotifyService) {}

  askUnknownQuestion(params: {
    question: string;
    sessionId?: string;
    inviteName?: string;
  }): {
    type: "pending";
    sessionId: string;
    ticketId: string;
    message: string;
  } {
    const question = params.question.trim();
    if (!question) {
      throw new BadRequestException("질문을 입력해 주세요.");
    }

    const sessionId = this.resolveSessionId(params.sessionId);
    const createdAt = new Date().toISOString();
    const ticketId = `ticket_${randomUUID().replace(/-/g, "").slice(0, 24)}`;

    const ticket: ChatbotTicket = {
      id: ticketId,
      sessionId,
      question,
      inviteName: params.inviteName?.trim() || null,
      status: "pending",
      response: null,
      createdAt,
      answeredAt: null
    };

    this.ticketsById.set(ticket.id, ticket);
    this.ticketOrder.unshift(ticket.id);
    this.trimTickets();

    this.stream$.next({
      type: "ticket_created",
      ticket
    });

    const inviteLabel = ticket.inviteName ? ` (${ticket.inviteName})` : "";
    void this.notifyService.sendRsvpNotification(
      `[실시간 문의] ${question}${inviteLabel}`
    );

    return {
      type: "pending",
      sessionId,
      ticketId: ticket.id,
      message: "질문을 관리자에게 전달했어요. 답변이 오면 이 화면에서 바로 알려드릴게요."
    };
  }

  respondToTicket(ticketId: string, response: string): ChatbotTicket {
    const normalizedTicketId = ticketId.trim();
    const normalizedResponse = response.trim();
    if (!normalizedTicketId) {
      throw new BadRequestException("문의 ID가 필요합니다.");
    }
    if (!normalizedResponse) {
      throw new BadRequestException("답변 내용을 입력해 주세요.");
    }

    const current = this.ticketsById.get(normalizedTicketId);
    if (!current) {
      throw new NotFoundException("문의를 찾을 수 없습니다.");
    }

    const answeredAt = new Date().toISOString();
    const nextTicket: ChatbotTicket = {
      ...current,
      status: "answered",
      response: normalizedResponse,
      answeredAt
    };

    this.ticketsById.set(nextTicket.id, nextTicket);

    this.stream$.next({
      type: "ticket_answered",
      ticket: nextTicket
    });
    this.stream$.next({
      type: "admin_response",
      sessionId: nextTicket.sessionId,
      ticketId: nextTicket.id,
      message: normalizedResponse,
      answeredAt
    });

    return nextTicket;
  }

  listTickets(limit = 120): ChatbotTicket[] {
    const boundedLimit = Math.max(1, Math.min(300, limit));
    return this.ticketOrder
      .slice(0, boundedLimit)
      .map((id) => this.ticketsById.get(id))
      .filter((ticket): ticket is ChatbotTicket => Boolean(ticket));
  }

  streamForAdmin() {
    return merge(
      of<MessageEvent>({
        data: {
          type: "connected",
          scope: "admin",
          at: new Date().toISOString()
        }
      }),
      interval(25000).pipe(
        map(
          (): MessageEvent => ({
            data: { type: "ping", scope: "admin", at: new Date().toISOString() }
          })
        )
      ),
      this.stream$.pipe(
        filter((event) => event.type === "ticket_created" || event.type === "ticket_answered"),
        map(
          (event): MessageEvent => ({
            data: event
          })
        )
      )
    );
  }

  streamForSession(sessionId: string) {
    const normalizedSessionId = sessionId.trim();
    return merge(
      of<MessageEvent>({
        data: {
          type: "connected",
          scope: "guest",
          sessionId: normalizedSessionId,
          at: new Date().toISOString()
        }
      }),
      interval(25000).pipe(
        map(
          (): MessageEvent => ({
            data: {
              type: "ping",
              scope: "guest",
              sessionId: normalizedSessionId,
              at: new Date().toISOString()
            }
          })
        )
      ),
      this.stream$.pipe(
        filter(
          (event): event is Extract<ChatbotEvent, { type: "admin_response" }> =>
            event.type === "admin_response" && event.sessionId === normalizedSessionId
        ),
        map(
          (event): MessageEvent => ({
            data: event
          })
        )
      )
    );
  }

  private resolveSessionId(candidate?: string): string {
    const normalized = candidate?.trim() ?? "";
    if (/^[A-Za-z0-9_-]{8,80}$/.test(normalized)) {
      return normalized;
    }
    return `guest_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  }

  private trimTickets(): void {
    while (this.ticketOrder.length > this.maxTicketCount) {
      const oldId = this.ticketOrder.pop();
      if (oldId) {
        this.ticketsById.delete(oldId);
      }
    }
  }
}
