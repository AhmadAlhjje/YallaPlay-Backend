import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WhatsappService } from '../auth/whatsapp.service';

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function getArabicDay(dateStr: string): string {
  // dateStr is "YYYY-MM-DD" — parse as local midnight to avoid UTC-day shift
  const [y, m, d] = dateStr.split('-').map(Number);
  return ARABIC_DAYS[new Date(y, m - 1, d).getDay()];
}

// All notification types dispatched from other services land here.
// Centralizing in a Bull processor decouples notification logic from
// business logic and prevents blocking the main request thread.
@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Process('booking_confirmed')
  async onBookingConfirmed(job: Job) {
    const { userId, facilityName, date, startTime, endTime, userPhone, mapLink } = job.data;

    // 1. In-app + FCM push notification
    await this.notificationsService.sendPush({
      userId,
      type: 'booking_confirmed',
      title: '✅ تم تأكيد حجزك',
      body: `حجزك في ${facilityName} — ${getArabicDay(date)} ${date} الساعة ${startTime} – ${endTime ?? ''} مؤكد.`,
      data: { bookingId: job.data.bookingId, screen: 'BookingDetail' },
    });

    // 2. WhatsApp confirmation message — only after owner confirms
    if (userPhone) {
      const locationLine = mapLink ? `\n📍 الموقع على الخريطة: ${mapLink}` : '';
      const waMessage =
        `🏟️ تم الحجز بنجاح!\n` +
        `الملعب: ${facilityName}\n` +
        `📅 التاريخ: ${getArabicDay(date)} ${date}\n` +
        `🕐 الوقت: ${startTime} – ${endTime ?? ''}` +
        locationLine;

      this.whatsappService
        .sendMessage(userPhone, waMessage)
        .catch((err) => this.logger.warn(`WhatsApp booking confirm error: ${err?.message}`));
    }
  }

  @Process('booking_reminder')
  async onBookingReminder(job: Job) {
    const { userId, facilityName, date, startTime } = job.data;
    await this.notificationsService.sendPush({
      userId,
      type: 'booking_reminder',
      title: '⏰ تذكير بحجزك',
      body: `لديك حجز في ${facilityName} بعد ساعتين — ${date} الساعة ${startTime}`,
      data: { bookingId: job.data.bookingId, screen: 'BookingDetail' },
    });
  }

  @Process('booking_cancelled_by_owner')
  async onCancelledByOwner(job: Job) {
    const { userId, facilityName, date, startTime } = job.data;
    await this.notificationsService.sendPush({
      userId,
      type: 'booking_cancelled',
      title: '❌ تم إلغاء حجزك',
      body: `تم إلغاء حجزك في ${facilityName} بتاريخ ${date} الساعة ${startTime} من قبل صاحب الملعب.`,
      data: { bookingId: job.data.bookingId, screen: 'BookingDetail' },
    });
  }

  @Process('booking_cancelled_by_user')
  async onCancelledByUser(job: Job) {
    const { ownerId, date, startTime } = job.data;
    await this.notificationsService.sendPush({
      userId: ownerId,
      type: 'booking_cancelled',
      title: '❌ إلغاء حجز',
      body: `تم إلغاء الحجز بتاريخ ${date} الساعة ${startTime}.`,
      data: { bookingId: job.data.bookingId, screen: 'OwnerBookings' },
    });
  }

  @Process('new_booking')
  async onNewBooking(job: Job) {
    const { ownerId, facilityName, date, startTime, userName } = job.data;
    await this.notificationsService.sendPush({
      userId: ownerId,
      type: 'new_booking',
      title: '📋 حجز جديد',
      body: `طلب ${userName} حجزاً في ${facilityName} بتاريخ ${date} الساعة ${startTime}. راجع الحجز وأكّده.`,
      data: { bookingId: job.data.bookingId, screen: 'OwnerBookings' },
    });
  }

  @Process('payment_submitted')
  async onPaymentSubmitted(job: Job) {
    const { ownerId, facilityName, date, startTime, userName } = job.data;
    await this.notificationsService.sendPush({
      userId: ownerId,
      type: 'payment_submitted',
      title: '💳 تم إرسال الدفع',
      body: `تم إرسال دفع لحجز ${userName} في ${facilityName} بتاريخ ${date} الساعة ${startTime}.`,
      data: { bookingId: job.data.bookingId, screen: 'OwnerBookings' },
    });
  }

  @Process('waitlist_slot_available')
  async onWaitlistSlotAvailable(job: Job) {
    const { userId, facilityId, date, startTime, claimWindowMinutes } = job.data;
    await this.notificationsService.sendPush({
      userId,
      type: 'waitlist_available',
      title: '🟢 الوقت متاح الآن!',
      body: `أصبح وقت ${startTime} بتاريخ ${date} متاحاً. لديك ${claimWindowMinutes} دقيقة للحجز.`,
      data: { facilityId, date, startTime, screen: 'FacilityDetail' },
    });
  }

  @Process('points_earned')
  async onPointsEarned(job: Job) {
    const { userId, points, totalPoints } = job.data;
    await this.notificationsService.sendPush({
      userId,
      type: 'points_earned',
      title: '⭐ نقاط جديدة!',
      body: `ربحت ${points} نقاط. رصيدك الحالي: ${totalPoints} نقطة.`,
      data: { screen: 'Points' },
    });
  }
}
