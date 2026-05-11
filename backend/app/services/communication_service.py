"""
Сервис для коммуникации с клиентами
====================================

Обрабатывает:
- Email рассылки
- SMS рассылки  
- Telegram рассылки
- Управление кампаниями
- Персонализацию сообщений
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func as sa_func
import aiosmtplib
import aiohttp
import logging

from app.models import Client
from app.models.communication import (
    Campaign, MessageTemplate, ClientSegment, CommunicationLog,
    CampaignType, CampaignStatus, MessageChannel
)
from app.services.notification_service import notification_service
from app.database import get_db_session_factory

logger = logging.getLogger(__name__)


class CommunicationService:
    """Сервис для коммуникации с клиентами"""
    
    def __init__(self, db_session_factory, smtp_config=None, sms_config=None):
        self.db_session_factory = db_session_factory
        self.smtp_config = smtp_config or {}
        self.sms_config = sms_config or {}
    
    async def create_campaign(self, campaign_data: dict) -> Campaign:
        """Создать новую маркетинговую кампанию"""
        async with self.db_session_factory() as db:
            campaign = Campaign(**campaign_data)
            db.add(campaign)
            await db.commit()
            await db.refresh(campaign)
            
            logger.info(f"Created campaign {campaign.id}: {campaign.name}")
            return campaign
    
    async def send_campaign(self, campaign_id: int) -> Dict[str, Any]:
        """Отправить кампанию"""
        async with self.db_session_factory() as db:
            result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
            campaign = result.scalar_one_or_none()
            
            if not campaign:
                raise ValueError("Campaign not found")
            
            # Обновляем статус
            campaign.status = CampaignStatus.SENDING
            campaign.sent_at = datetime.utcnow()
            await db.commit()
            
            try:
                # Получаем получателей
                recipients = await self._get_campaign_recipients(db, campaign)
                
                # Отправляем сообщения
                sent_count = 0
                failed_count = 0
                
                for recipient in recipients:
                    try:
                        success = await self._send_message(
                            campaign.channel,
                            recipient['email'] if campaign.channel == MessageChannel.EMAIL else recipient['phone'],
                            recipient['telegram_id'] if campaign.channel == MessageChannel.TELEGRAM else None,
                            campaign.subject,
                            await self._personalize_message(campaign.message_text, recipient),
                            campaign.attachments
                        )
                        
                        if success:
                            sent_count += 1
                        else:
                            failed_count += 1
                            
                        # Логируем отправку
                        await self._log_communication(db, {
                            'campaign_id': campaign.id,
                            'client_id': recipient['id'],
                            'channel': campaign.channel,
                            'recipient': recipient['email'] if campaign.channel == MessageChannel.EMAIL else recipient['phone'],
                            'subject': campaign.subject,
                            'message_text': await self._personalize_message(campaign.message_text, recipient),
                            'status': 'sent' if success else 'failed',
                            'sent_at': datetime.utcnow()
                        })
                        
                    except Exception as e:
                        logger.error(f"Error sending to {recipient['id']}: {e}")
                        failed_count += 1
                
                # Обновляем статистику кампании
                campaign.total_recipients = len(recipients)
                campaign.sent_count = sent_count
                campaign.failed_count = failed_count
                campaign.status = CampaignStatus.SENT
                await db.commit()
                
                logger.info(f"Campaign {campaign_id} sent: {sent_count}/{len(recipients)}")
                
                return {
                    'sent_count': sent_count,
                    'failed_count': failed_count,
                    'total_recipients': len(recipients),
                    'success_rate': (sent_count / len(recipients) * 100) if recipients else 0
                }
                
            except Exception as e:
                campaign.status = CampaignStatus.CANCELLED
                await db.commit()
                logger.error(f"Campaign {campaign_id} failed: {e}")
                raise
    
    async def _get_campaign_recipients(self, db: AsyncSession, campaign: Campaign) -> List[Dict]:
        """Получить список получателей для кампании"""
        recipients = []
        
        # Если указаны конкретные клиенты
        if campaign.target_client_ids:
            client_ids = json.loads(campaign.target_client_ids)
            result = await db.execute(
                select(Client).where(Client.id.in_(client_ids))
            )
            clients = result.scalars().all()
            
            for client in clients:
                recipients.append({
                    'id': client.id,
                    'name': client.name,
                    'email': client.email,
                    'phone': client.phone,
                    'telegram_id': client.chat_id
                })
        
        # Если указаны сегменты
        elif campaign.target_segments:
            segment_ids = json.loads(campaign.target_segments)
            result = await db.execute(
                select(Client).join(ClientSegment.clients).where(
                    ClientSegment.id.in_(segment_ids)
                )
            )
            clients = result.scalars().all()
            
            for client in clients:
                recipients.append({
                    'id': client.id,
                    'name': client.name,
                    'email': client.email,
                    'phone': client.phone,
                    'telegram_id': client.chat_id
                })
        
        # Исключаем клиентов
        if campaign.exclude_client_ids:
            exclude_ids = json.loads(campaign.exclude_client_ids)
            recipients = [r for r in recipients if r['id'] not in exclude_ids]
        
        return recipients
    
    async def _personalize_message(self, template: str, recipient: Dict) -> str:
        """Персонализировать сообщение для получателя"""
        message = template
        
        # Заменяем переменные
        replacements = {
            '{client_name}': recipient.get('name', 'Клиент'),
            '{client_email}': recipient.get('email', ''),
            '{client_phone}': recipient.get('phone', ''),
            '{salon_name}': 'Beauty Studio',
            '{current_date}': datetime.now().strftime("%d.%m.%Y"),
            '{current_time}': datetime.now().strftime("%H:%M")
        }
        
        for placeholder, value in replacements.items():
            message = message.replace(placeholder, str(value))
        
        return message
    
    async def _send_message(
        self, 
        channel: MessageChannel, 
        recipient: str, 
        telegram_id: Optional[int],
        subject: Optional[str], 
        message: str, 
        attachments: Optional[str] = None
    ) -> bool:
        """Отправить сообщение через указанный канал"""
        try:
            if channel == MessageChannel.EMAIL:
                return await self._send_email(recipient, subject, message, attachments)
            elif channel == MessageChannel.SMS:
                return await self._send_sms(recipient, message)
            elif channel == MessageChannel.TELEGRAM:
                return await self._send_telegram(telegram_id, message)
            elif channel == MessageChannel.PUSH:
                return await self._send_push(recipient, message)
            else:
                logger.warning(f"Unsupported channel: {channel}")
                return False
        except Exception as e:
            logger.error(f"Error sending message via {channel}: {e}")
            return False
    
    async def _send_email(self, to_email: str, subject: str, message: str, attachments: Optional[str] = None) -> bool:
        """Отправить email"""
        try:
            import aiosmtplib
            
            smtp = aiosmtplib.SMTP(
                hostname=self.smtp_config.get('host', 'localhost'),
                port=self.smtp_config.get('port', 587),
                use_tls=True
            )
            
            await smtp.connect(
                username=self.smtp_config.get('username'),
                password=self.smtp_config.get('password')
            )
            
            from_email = self.smtp_config.get('from_email', 'noreply@beautystudio.com')
            
            msg = aiosmtplib.email.message.EmailMessage()
            msg['From'] = from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.set_content(message, subtype='html')
            
            await smtp.send_message(from_email, [to_email], msg)
            await smtp.quit()
            
            logger.info(f"Email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    async def _send_sms(self, phone: str, message: str) -> bool:
        """Отправить SMS"""
        try:
            # Интеграция с SMS провайдером (например, Twilio, SMS.ru)
            # Это заглушка - нужно настроить конкретного провайдера
            
            logger.info(f"SMS sent to {phone}: {message[:50]}...")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone}: {e}")
            return False
    
    async def _send_telegram(self, telegram_id: int, message: str) -> bool:
        """Отправить Telegram сообщение"""
        try:
            success = await notification_service.send_telegram_message(telegram_id, message)
            logger.info(f"Telegram message sent to {telegram_id}")
            return success
        except Exception as e:
            logger.error(f"Failed to send Telegram message to {telegram_id}: {e}")
            return False
    
    async def _send_push(self, recipient: str, message: str) -> bool:
        """Отправить push уведомление"""
        try:
            # Интеграция с push сервисом (Firebase, OneSignal и т.д.)
            # Это заглушка - нужно настроить конкретного провайдера
            
            logger.info(f"Push notification sent to {recipient}: {message[:50]}...")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send push to {recipient}: {e}")
            return False
    
    async def _log_communication(self, db: AsyncSession, log_data: dict):
        """Логировать коммуникацию"""
        log = CommunicationLog(**log_data)
        db.add(log)
        await db.commit()
    
    async def create_segment(self, segment_data: dict) -> ClientSegment:
        """Создать сегмент клиентов"""
        async with self.db_session_factory() as db:
            segment = ClientSegment(**segment_data)
            db.add(segment)
            await db.commit()
            await db.refresh(segment)
            
            logger.info(f"Created segment {segment.id}: {segment.name}")
            return segment
    
    async def update_segment_clients(self, segment_id: int, client_ids: List[int]) -> int:
        """Обновить клиентов в сегменте"""
        async with self.db_session_factory() as db:
            # Удаляем старые связи
            from app.models.communication import SegmentClient
            await db.execute(
                SegmentClient.__table__.delete().where(SegmentClient.segment_id == segment_id)
            )
            
            # Добавляем новые связи
            for client_id in client_ids:
                link = SegmentClient(segment_id=segment_id, client_id=client_id)
                db.add(link)
            
            await db.commit()
            
            # Обновляем количество клиентов
            segment = await db.get(ClientSegment, segment_id)
            if segment:
                segment.client_count = len(client_ids)
                segment.last_updated = datetime.utcnow()
                await db.commit()
            
            logger.info(f"Updated segment {segment_id} with {len(client_ids)} clients")
            return len(client_ids)
    
    async def get_campaign_analytics(self, campaign_id: int) -> Dict:
        """Получить аналитику по кампании"""
        async with self.db_session_factory() as db:
            result = await db.execute(
                select(Campaign).where(Campaign.id == campaign_id)
            )
            campaign = result.scalar_one_or_none()
            
            if not campaign:
                return {}
            
            # Получаем детальные логи
            result = await db.execute(
                select(CommunicationLog).where(CommunicationLog.campaign_id == campaign_id)
            )
            logs = result.scalars().all()
            
            # Считаем метрики
            delivered = len([l for l in logs if l.status == 'delivered'])
            opened = len([l for l in logs if l.opened_at])
            clicked = len([l for l in logs if l.clicked_at])
            failed = len([l for l in logs if l.status == 'failed'])
            
            return {
                'campaign_id': campaign_id,
                'campaign_name': campaign.name,
                'campaign_type': campaign.campaign_type.value,
                'total_sent': campaign.sent_count,
                'delivered': delivered,
                'opened': opened,
                'clicked': clicked,
                'failed': failed,
                'open_rate': (opened / delivered * 100) if delivered > 0 else 0,
                'click_rate': (clicked / delivered * 100) if delivered > 0 else 0,
                'delivery_rate': (delivered / campaign.sent_count * 100) if campaign.sent_count > 0 else 0,
                'created_at': campaign.created_at,
                'sent_at': campaign.sent_at
            }
    
    async def schedule_birthday_campaigns(self) -> int:
        """Запланировать поздравления с днем рождения"""
        async with self.db_session_factory() as db:
            # Получаем клиентов с днем рождения сегодня
            today = datetime.now()
            today_month_day = f"{today.month:02d}-{today.day:02d}"
            
            # Предполагаем что в модели Client есть поле birthday
            result = await db.execute(
                select(Client).where(
                    # Client.birthday.like(f"%-{today_month_day}")
                    Client.email.isnot(None)  # Только с email
                )
            )
            clients = result.scalars().all()
            
            campaigns_created = 0
            
            for client in clients:
                # Создаем персонализированную кампанию для каждого клиента
                campaign_data = {
                    'name': f"Поздравление с днем рождения - {client.name}",
                    'description': f"Автоматическое поздравление с днем рождения для {client.name}",
                    'campaign_type': CampaignType.BIRTHDAY,
                    'channel': MessageChannel.EMAIL,
                    'send_immediately': True,
                    'target_client_ids': json.dumps([client.id]),
                    'subject': '🎉 Поздравляем с днем рождения!',
                    'message_text': f'''
                        <h2>🎉 Уважаемый(ая) {client.name}!</h2>
                        
                        <p>Команда Beauty Studio от всего сердца поздравляет Вас с днем рождения!</p>
                        
                        <p>Желаем Вам здоровья, счастья и успехов во всех начинаниях.</p>
                        
                        <p>В честь праздника дарим Вам скидку <strong>15%</strong> на следующую услугу!</p>
                        
                        <p>Промокод: <strong>BIRTHDAY{client.id}</strong></p>
                        
                        <p>С уважением,<br>Команда Beauty Studio</p>
                    '''.strip(),
                    'personalization_enabled': True
                }
                
                campaign = await self.create_campaign(campaign_data)
                await self.send_campaign(campaign.id)
                campaigns_created += 1
            
            logger.info(f"Created {campaigns_created} birthday campaigns")
            return campaigns_created


# Глобальный экземпляр сервиса
communication_service = None


def init_communication_service(db_session_factory, smtp_config=None, sms_config=None):
    """Инициализировать глобальный сервис коммуникации"""
    global communication_service
    communication_service = CommunicationService(db_session_factory, smtp_config, sms_config)


# Background task для ежедневных поздравлений
async def start_birthday_scheduler():
    """Запустить планировщик поздравлений с днем рождения"""
    while True:
        try:
            if communication_service:
                await communication_service.schedule_birthday_campaigns()
            # Проверяем каждый день в 9 утра
            now = datetime.now()
            next_run = now.replace(hour=9, minute=0, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
            
            sleep_seconds = (next_run - now).total_seconds()
            await asyncio.sleep(sleep_seconds)
        except Exception as e:
            logger.error(f"Birthday scheduler error: {e}")
            await asyncio.sleep(3600)  # При ошибке ждем 1 час
