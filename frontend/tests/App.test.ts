import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StatusBadge from '../src/components/ui/StatusBadge.vue';

describe('StatusBadge Component', () => {
  it('renders healthy status with proper class and label', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'healthy',
        label: 'OPERATIONAL',
      },
    });

    expect(wrapper.text()).toContain('OPERATIONAL');
    expect(wrapper.classes()).toContain('badge-emerald');
  });

  it('renders unhealthy status with proper class', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'unhealthy',
      },
    });

    expect(wrapper.text()).toContain('unhealthy');
    expect(wrapper.classes()).toContain('badge-rose');
  });
});
