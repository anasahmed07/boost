interface ToggleSwitchProps {
	checked: boolean; // 🔥 controlled state
	onChange?: (checked: boolean) => void;
	disabled?: boolean;
	size?: 'sm' | 'md' | 'lg';
	color?: 'blue' | 'green' | 'purple' | 'red' | 'orange';
	'aria-label'?: string;
	className?: string;
}

export default function ToggleSwitch({
										 checked,
										 onChange,
										 disabled = false,
										 size = 'md',
										 color = 'blue',
										 'aria-label': ariaLabel,
										 className = '',
									 }: ToggleSwitchProps) {

	const handleToggle = () => {
		if (disabled) return;
		onChange?.(!checked);
	};

	const sizeConfigs = {
		sm: { switch: 'h-5 w-9', thumb: 'h-3 w-3', translate: 'translate-x-4', translateOff: 'translate-x-0.5' },
		md: { switch: 'h-6 w-11', thumb: 'h-4 w-4', translate: 'translate-x-6', translateOff: 'translate-x-1' },
		lg: { switch: 'h-8 w-14', thumb: 'h-6 w-6', translate: 'translate-x-7', translateOff: 'translate-x-1' },
	};

	const colorConfigs = {
		blue: 'bg-blue-500',
		green: 'bg-green-500',
		purple: 'bg-purple-500',
		red: 'bg-red-500',
		orange: 'bg-orange-500',
	};

	const config = sizeConfigs[size];
	const enabledColor = colorConfigs[color];

	return (
		<button
			type="button"
			onClick={handleToggle}
			disabled={disabled}
			className={`
        relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${config.switch}
        ${checked && !disabled ? enabledColor : 'bg-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `.trim()}
			role="switch"
			aria-checked={checked}
			aria-label={ariaLabel}
		>
      <span
		  className={`
          inline-block transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out
          ${config.thumb}
          ${checked ? config.translate : config.translateOff}
        `.trim()}
	  />
		</button>
	);
}

export { ToggleSwitch };
