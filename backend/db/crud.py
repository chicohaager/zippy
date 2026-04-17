from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

from backend.config import settings
from backend.db.models import Base, Conversation, Message


_engine: AsyncEngine = create_async_engine(settings.db_url, future=True)
_Session = async_sessionmaker(_engine, expire_on_commit=False)


async def init_db() -> None:
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def session() -> AsyncSession:
    return _Session()


async def create_conversation(title: str = "New conversation") -> Conversation:
    async with _Session() as s:
        conv = Conversation(title=title)
        s.add(conv)
        await s.commit()
        await s.refresh(conv)
        return conv


async def get_conversation(conv_id: int) -> Conversation | None:
    async with _Session() as s:
        result = await s.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.id == conv_id)
        )
        return result.scalar_one_or_none()


async def list_conversations(limit: int = 100) -> list[Conversation]:
    async with _Session() as s:
        result = await s.execute(
            select(Conversation).order_by(Conversation.updated_at.desc()).limit(limit)
        )
        return list(result.scalars())


async def add_message(conv_id: int, role: str, content: str) -> Message:
    async with _Session() as s:
        msg = Message(conversation_id=conv_id, role=role, content=content)
        s.add(msg)
        await s.commit()
        await s.refresh(msg)
        return msg


async def delete_conversation(conv_id: int) -> bool:
    async with _Session() as s:
        conv = await s.get(Conversation, conv_id)
        if conv is None:
            return False
        await s.delete(conv)
        await s.commit()
        return True


async def delete_message(conv_id: int, msg_id: int) -> bool:
    async with _Session() as s:
        msg = await s.get(Message, msg_id)
        if msg is None or msg.conversation_id != conv_id:
            return False
        await s.delete(msg)
        await s.commit()
        return True


async def rename_conversation(conv_id: int, title: str) -> bool:
    async with _Session() as s:
        conv = await s.get(Conversation, conv_id)
        if conv is None:
            return False
        conv.title = title
        await s.commit()
        return True
