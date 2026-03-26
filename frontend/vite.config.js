import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(async ({ mode }) => {
	const isDev = mode === 'development'
	const config = {
		plugins: [vue()],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, 'src'),
			},
		},
		optimizeDeps: {
			include: ['feather-icons'],
			exclude: ['frappe-ui'],
		},
		server: {
			allowedHosts: true,
			fs: {
				allow: [path.resolve(__dirname, '..')],
			},
		},
	}

	const frappeui = await importFrappeUIPlugin(isDev, config)
	config.plugins.unshift(
		frappeui({
			frappeProxy: true,
			lucideIcons: true,
			jinjaBootData: true,
			buildConfig: {
				indexHtmlPath: '../parchat/www/parchat.html',
				emptyOutDir: true,
				sourcemap: true,
			},
		}),
	)

	return config
})

async function importFrappeUIPlugin(isDev, config) {
	if (isDev) {
		try {
			const fs = await import('node:fs')
			const localVitePluginPath = path.resolve(__dirname, '../frappe-ui/vite')
			if (fs.existsSync(localVitePluginPath)) {
				const module = await import('../frappe-ui/vite')
				console.info('Local frappe-ui vite plugin found, using local plugin')
				return module.default
			}
		} catch (error) {
			console.warn('Local frappe-ui not found, falling back to npm package:', error.message)
		}
	}
	const module = await import('frappe-ui/vite')
	return module.default
}
