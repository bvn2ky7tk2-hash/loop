import { TelegramCardBuilder, escapeMarkdownV2, TaskCardData } from './telegram-card.builder';

describe('TelegramCardBuilder', () => {
  let builder: TelegramCardBuilder;

  beforeEach(() => {
    builder = new TelegramCardBuilder();
  });

  const baseTask: TaskCardData = {
    id: 'task-abc-123',
    title: 'Fix login bug',
    dueDate: new Date('2026-06-01'),
    estimateHours: 4,
    assigneeName: 'Nguyen Van A',
    projectName: 'Loop Project',
  };

  describe('buildTaskCard NEW_TASK', () => {
    it('should contain task title in text', () => {
      const card = builder.buildTaskCard(baseTask, 'NEW_TASK');
      expect(card.text).toContain('Fix login bug');
    });

    it('should have NEW_TASK header', () => {
      const card = builder.buildTaskCard(baseTask, 'NEW_TASK');
      expect(card.text).toContain('Task mới được giao');
    });

    it('should have correct callback_data format task:done:{id}', () => {
      const card = builder.buildTaskCard(baseTask, 'NEW_TASK');
      const buttons = card.reply_markup.inline_keyboard[0];
      expect(buttons[0].callback_data).toBe('task:done:task-abc-123');
      expect(buttons[1].callback_data).toBe('task:inprogress:task-abc-123');
      expect(buttons[2].callback_data).toBe('task:return:task-abc-123');
    });

    it('should have 3 inline keyboard buttons', () => {
      const card = builder.buildTaskCard(baseTask, 'NEW_TASK');
      expect(card.reply_markup.inline_keyboard[0]).toHaveLength(3);
    });
  });

  describe('buildTaskCard DEADLINE_ALERT', () => {
    it('should have DEADLINE_ALERT header', () => {
      const card = builder.buildTaskCard(baseTask, 'DEADLINE_ALERT');
      expect(card.text).toContain('Task sắp đến hạn');
    });

    it('should still have correct callback_data', () => {
      const card = builder.buildTaskCard(baseTask, 'DEADLINE_ALERT');
      const buttons = card.reply_markup.inline_keyboard[0];
      expect(buttons[0].callback_data).toBe('task:done:task-abc-123');
    });
  });

  describe('escapeMarkdownV2', () => {
    it('should escape dot character', () => {
      expect(escapeMarkdownV2('hello.world')).toBe('hello\\.world');
    });

    it('should escape exclamation mark', () => {
      expect(escapeMarkdownV2('hello!')).toBe('hello\\!');
    });

    it('should escape parentheses', () => {
      expect(escapeMarkdownV2('test(1)')).toBe('test\\(1\\)');
    });

    it('should escape underscore', () => {
      expect(escapeMarkdownV2('hello_world')).toBe('hello\\_world');
    });

    it('should escape dash', () => {
      expect(escapeMarkdownV2('hello-world')).toBe('hello\\-world');
    });

    it('should leave normal text unchanged', () => {
      expect(escapeMarkdownV2('Hello World 123')).toBe('Hello World 123');
    });
  });
});
