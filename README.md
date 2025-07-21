Integrantes 
- Cristian Sangucho
- Carla Ruiz
- Juan Carrillo
- Karina Arichavala
- Cristian Zambrano

I. Descripción breve de la herramienta 
FutManager by Hakan es una aplicación diseñada para optimizar los procesos manuales en un campeonato de fútbol local. Como primera aproximación en contextos funcionales y de seguridad, ofrece ciertas características a los usuarios finales (administradores del sistema, dueños de equipos y representantes de la liga) para automatizar y optimizar estos procesos, proporcionando un valor inicial significativo. ✨

La aplicación cuenta con un sistema de autenticación robusto, que incluye inicio de sesión y registro de usuarios, impulsado por Supabase, asegurando seguridad y escalabilidad desde el backend. 🔐 La base de datos, también desarrollada utilizando Supabase y PostgreSQL, está estructurada para gestionar las siguientes entidades esenciales para la gestión del campeonato:

Jugadores ⛹️: Incluye atributos como ID, nombre, apellido, equipo y su relación con las sanciones, permitiendo una clara trazabilidad de cada participante.

Equipos 🥅: Definidos por su nombre, número de jugadores y sanciones asociadas.

Sanciones 🚫: Con descripciones detalladas y montos correspondientes, facilitando una administración transparente de las penalizaciones.

Roles y permisos 🔑: Diseñados estratégicamente para delimitar responsabilidades y acciones disponibles según el perfil del usuario.

Cada rol tiene funciones específicas dentro del sistema:

Administrador 🧑‍💻: Responsable de registrar y verificar equipos y jugadores a través de un proceso de validación manual.

Dueño de Equipo 🧢: Autorizado para registrar su propio equipo, consultar su lista de jugadores y ver tanto sanciones individuales como colectivas.

Vocal 🗣️: Responsable de registrar y eliminar sanciones aplicables a jugadores y equipos. Actualmente, sus acciones se gestionan desde el backend, siendo la interfaz gráfica una responsabilidad del equipo de desarrollo.

Este enfoque modular y controlado mejora la transparencia y eficiencia del torneo, al mismo tiempo que sienta las bases para futuras expansiones del sistema hacia una experiencia completamente digital y automatizada para cualquier característica solicitada. 🚀

II. Backlog de Requerimientos de seguridad 🔑

ID	Descripción del requerimiento	Tipo	Pts historia	Sprint asignado
S-01	Respuesta automática ante violaciones de seguridad (FAU_ARP)	Funcional	5	1
S-02	Registro de acciones de usuarios para no repudio (FAU_GEN.1.2)	Funcional	5	1
S-03	Restricción de acceso a datos de auditoría (FAU_SAR.1.1)	Funcional	3	1
S-05	Gestión del almacenamiento de auditoría (FAU_STG.2-.5)	Funcional	5	2
S-04	Control de acceso basado en atributos (FDP_ACF.1)	Funcional	5	2
S-06	Declaración de roles y recursos permitidos (FDP_ACF.1.1)	Funcional	3	2
S-07	Definir acciones permitidas por rol (FDP_ACF.1.2)	Funcional	3	2
S-08	Generar hash de archivos para comprobar integridad (FDP_DAU.1.1)	No funcional	5	3
S-09	Comparar hash del archivo (FDP_DAU.1.2)	Funcional	3	3
S-10	Firma digital de archivos (FDP_DAU.2.2)	Funcional	5	3
S-11	Bloqueo tras intentos fallidos (FIA_AFL.1.1)	No funcional	3	1
S-12	Tiempo de espera tras fallos repetidos (FIA_AFL.1.2)	No funcional	3	1
S-13	Verificación de identidad con código por correo (FIA_API.1.1)	Funcional	5	1
S-14	Restricción de acciones según rol definido (FIA_ATD.1)	Funcional	3	2
S-15	Autenticación obligatoria (FIA_UAU.2)	Funcional	3	1
S-16	Mensajes de error genéricos (FIA_UAU.7)	No funcional	2	1
S-17	Bloqueo de acciones fuera de rol (FIA_USB.1.1)	Funcional	4	2
S-18	Aplicación de reglas de negocio por rol (FIA_USB.1.2)	Funcional	4	2



