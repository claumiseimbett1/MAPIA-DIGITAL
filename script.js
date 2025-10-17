// ==========================================
// MAPIA DIGITAL - Main JavaScript
// ==========================================

// ==========================================
// CONFIGURACIÓN - REEMPLAZA CON TUS CREDENCIALES
// ==========================================
const CONFIG = {
    // EmailJS
    emailjs: {
        publicKey: 'LB0ZmyG25EX_pUkrW',
        serviceId: 'service_nlj8rfl',
        templateId: 'template_58gr2hh'
    },
    // Google Drive
    googleDrive: {
        apiKey: 'AIzaSyAGkLHin7JWzltX2JXshNq3Gx_VpogSeVE',
        clientId: '772512304413-mpt0t28du7dq7uk6i3gqd4oq6hugqhot.apps.googleusercontent.com',
        folderId: '16teXO9Vlgun4XSdwR0xJSwlr8aQeuJs-'
    }
};

// Initialize EmailJS
emailjs.init(CONFIG.emailjs.publicKey);

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let uploadedFiles = {
    image: null,
    vector: null
};
let mapCoordinates = null;
let map = null;
let drawingManager = null;
let currentShape = null;
let contactFormCompleted = false;

// ==========================================
// MOBILE MENU
// ==========================================
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
    }
});

// ==========================================
// SMOOTH SCROLLING
// ==========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// ==========================================
// CONTACT FORM VALIDATION
// ==========================================
function validateContactForm() {
    const userName = document.getElementById('userName').value.trim();
    const userEmail = document.getElementById('userEmail').value.trim();

    if (!userName || !userEmail) {
        alert('⚠️ Por favor completa primero el formulario de Información de Contacto (Nombre y Email) antes de cargar archivos o enviar la solicitud.');
        // Scroll al formulario de contacto
        document.getElementById('userName').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
        alert('⚠️ Por favor ingresa un email válido en el formulario de Información de Contacto.');
        document.getElementById('userEmail').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    contactFormCompleted = true;
    return true;
}

// Validar el formulario en tiempo real cuando cambian los campos
document.addEventListener('DOMContentLoaded', function() {
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');

    if (userName && userEmail) {
        userName.addEventListener('input', function() {
            if (userName.value.trim() && userEmail.value.trim()) {
                contactFormCompleted = validateContactForm();
            }
        });

        userEmail.addEventListener('input', function() {
            if (userName.value.trim() && userEmail.value.trim()) {
                contactFormCompleted = validateContactForm();
            }
        });
    }
});

// ==========================================
// FILE UPLOAD HANDLERS
// ==========================================
document.getElementById('imageUpload').addEventListener('change', function(e) {
    // Validar formulario de contacto primero
    if (!validateContactForm()) {
        e.target.value = ''; // Limpiar la selección de archivo
        return;
    }

    const file = e.target.files[0];
    if (file) {
        uploadedFiles.image = file;
        document.getElementById('imageStatus').innerHTML = `✓ ${file.name}<br>${(file.size / (1024 * 1024)).toFixed(2)} MB`;
        document.querySelector('#imageUpload').parentElement.querySelector('.upload-placeholder').style.background = 'var(--light-green)';
        document.querySelector('#imageUpload').parentElement.querySelector('.upload-placeholder').style.color = 'white';
    }
});

document.getElementById('vectorUpload').addEventListener('change', function(e) {
    // Validar formulario de contacto primero
    if (!validateContactForm()) {
        e.target.value = ''; // Limpiar la selección de archivo
        return;
    }

    const file = e.target.files[0];
    if (file) {
        uploadedFiles.vector = file;
        document.getElementById('vectorStatus').innerHTML = `✓ ${file.name}<br>${(file.size / (1024 * 1024)).toFixed(2)} MB`;
        document.querySelector('#vectorUpload').parentElement.querySelector('.upload-placeholder').style.background = 'var(--light-green)';
        document.querySelector('#vectorUpload').parentElement.querySelector('.upload-placeholder').style.color = 'white';
    }
});

// ==========================================
// GOOGLE MAPS MODAL
// ==========================================
function openMapModal() {
    // Validar formulario de contacto primero
    if (!validateContactForm()) {
        return;
    }

    document.getElementById('mapModal').style.display = 'flex';
    if (!map) {
        initMap();
    }
}

function closeMapModal() {
    document.getElementById('mapModal').style.display = 'none';
}

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        // TODO: The Drawing library is deprecated. Consider migrating to a different drawing tool.
        center: { lat: 4.5709, lng: -74.2973 }, // Colombia centro
        zoom: 6,
        mapTypeId: 'satellite'
    });

    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['polygon', 'marker']
        },
        polygonOptions: {
            fillColor: '#5db53a',
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: '#4e7e32',
            clickable: true,
            editable: true,
            draggable: true
        },
        markerOptions: {
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
            }
        }
    });

    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
        if (currentShape) {
            currentShape.setMap(null);
        }
        currentShape = event.overlay;
    });
}

function clearMapDrawing() {
    if (currentShape) {
        currentShape.setMap(null);
        currentShape = null;
    }
    mapCoordinates = null;
}

function saveMapCoordinates() {
    if (!currentShape) {
        alert('Por favor dibuja un área en el mapa primero');
        return;
    }

    if (currentShape.getPath) {
        // Es un polígono
        const path = currentShape.getPath();
        const coordinates = [];
        for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            coordinates.push({
                lat: point.lat(),
                lng: point.lng()
            });
        }
        mapCoordinates = {
            type: 'polygon',
            coordinates: coordinates
        };
    } else if (currentShape.getPosition) {
        // Es un marcador
        const position = currentShape.getPosition();
        mapCoordinates = {
            type: 'marker',
            coordinates: {
                lat: position.lat(),
                lng: position.lng()
            }
        };
    }

    document.getElementById('mapStatus').innerHTML = `✓ Área seleccionada<br>${mapCoordinates.type === 'polygon' ? 'Polígono' : 'Punto'} guardado`;
    document.querySelector('#mapStatus').parentElement.style.background = 'var(--light-green)';
    document.querySelector('#mapStatus').parentElement.style.color = 'white';

    closeMapModal();
}

// ==========================================
// GOOGLE DRIVE UPLOAD
// ==========================================
async function uploadToGoogleDrive(file, fileName) {
    return new Promise((resolve, reject) => {
        const metadata = {
            name: fileName,
            mimeType: file.type,
            parents: [CONFIG.googleDrive.folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + gapi.client.getToken().access_token
            },
            body: form
        })
        .then(response => response.json())
        .then(data => {
            if (data.id) {
                // Hacer el archivo público
                fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + gapi.client.getToken().access_token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        role: 'reader',
                        type: 'anyone'
                    })
                })
                .then(() => resolve(data))
                .catch(reject);
            } else {
                reject(data);
            }
        })
        .catch(reject);
    });
}

function initGoogleDrive() {
    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', () => {
            gapi.client.init({
                apiKey: CONFIG.googleDrive.apiKey,
                clientId: CONFIG.googleDrive.clientId,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                scope: 'https://www.googleapis.com/auth/drive.file'
            })
            .then(() => {
                if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
                    return gapi.auth2.getAuthInstance().signIn();
                }
            })
            .then(resolve)
            .catch(reject);
        });
    });
}

// ==========================================
// FORMULARIO DE CONTACTO
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;

            // Obtener valores del formulario
            const contactName = document.getElementById('contactName').value.trim();
            const contactEmail = document.getElementById('contactEmail').value.trim();
            const contactPhone = document.getElementById('contactPhone').value.trim();
            const contactMessage = document.getElementById('contactMessage').value.trim();

            // Validaciones
            if (!contactName || !contactEmail || !contactMessage) {
                alert('Por favor completa todos los campos obligatorios (*)');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(contactEmail)) {
                alert('Por favor ingresa un email válido');
                return;
            }

            // Deshabilitar botón y mostrar estado de carga
            submitButton.textContent = 'Enviando...';
            submitButton.disabled = true;

            try {
                // Preparar datos para EmailJS
                const templateParams = {
                    user_name: contactName,
                    user_email: contactEmail,
                    user_phone: contactPhone || 'No especificado',
                    hectares: 'No especificado',
                    file_links: 'Consulta desde formulario de contacto',
                    map_coordinates: 'No aplica',
                    comments: contactMessage
                };

                // Enviar email con EmailJS
                await emailjs.send(
                    CONFIG.emailjs.serviceId,
                    CONFIG.emailjs.templateId,
                    templateParams
                );

                // Éxito
                alert('¡Mensaje enviado exitosamente! Te responderemos en menos de 24 horas.');

                // Limpiar formulario
                contactForm.reset();

            } catch (error) {
                console.error('Error al enviar:', error);
                alert('Hubo un error al enviar el mensaje. Por favor intenta de nuevo o contáctanos directamente a info@hypersatelliteapp.com');
            } finally {
                // Restaurar botón
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }
});

// ==========================================
// SUBMIT FORM
// ==========================================
async function submitAnalysisRequest() {
    // Validar formulario de contacto completo
    if (!validateContactForm()) {
        return;
    }

    const userName = document.getElementById('userName').value;
    const userEmail = document.getElementById('userEmail').value;

    // Validar que haya al menos un método de envío
    if (!uploadedFiles.image && !uploadedFiles.vector && !mapCoordinates) {
        alert('⚠️ Por favor selecciona al menos un método de envío: carga un archivo de imagen, un archivo vectorial, o selecciona un área en el mapa.');
        return;
    }

    // Mostrar loading
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Procesando...';
    button.disabled = true;

    try {
        let fileLinks = '';

        // Si hay archivos, subirlos a Google Drive
        if (uploadedFiles.image || uploadedFiles.vector) {
            await initGoogleDrive();

            if (uploadedFiles.image) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const result = await uploadToGoogleDrive(
                    uploadedFiles.image,
                    `${userName.replace(/\s+/g, '_')}_${timestamp}_ortomosaico_${uploadedFiles.image.name}`
                );
                fileLinks += `Ortomosaico: ${result.webViewLink}\n`;
            }

            if (uploadedFiles.vector) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const result = await uploadToGoogleDrive(
                    uploadedFiles.vector,
                    `${userName.replace(/\s+/g, '_')}_${timestamp}_vector_${uploadedFiles.vector.name}`
                );
                fileLinks += `Archivo vectorial: ${result.webViewLink}\n`;
            }
        }

        // Preparar datos para EmailJS
        const templateParams = {
            user_name: userName,
            user_email: userEmail,
            user_phone: document.getElementById('userPhone').value || 'No especificado',
            hectares: document.getElementById('hectares').value || 'No especificado',
            file_links: fileLinks || 'No se cargaron archivos',
            map_coordinates: mapCoordinates ? JSON.stringify(mapCoordinates, null, 2) : 'No se seleccionó área en el mapa',
            comments: document.getElementById('comments').value || 'Sin comentarios'
        };

        // Enviar email con EmailJS
        await emailjs.send(
            CONFIG.emailjs.serviceId,
            CONFIG.emailjs.templateId,
            templateParams
        );

        // Éxito
        alert('¡Solicitud enviada exitosamente! Recibirás una respuesta en menos de 24 horas.');

        // Limpiar formulario
        document.getElementById('uploadForm').reset();
        document.getElementById('comments').value = '';
        uploadedFiles = { image: null, vector: null };
        mapCoordinates = null;

        // Resetear estados visuales
        document.getElementById('imageStatus').innerHTML = '↑ Click para subir<br>Formatos: TIFF, GeoTIFF, HDF';
        document.getElementById('vectorStatus').innerHTML = '↑ Click para subir<br>Formatos: .KML, .KMZ, .SHP, .ZIP';
        document.getElementById('mapStatus').innerHTML = '↑ Click para abrir mapa<br>Dibuja o marca tu área';

        document.querySelectorAll('.upload-placeholder').forEach(el => {
            el.style.background = 'var(--bg-white)';
            el.style.color = '#666';
        });

    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un error al enviar la solicitud. Por favor intenta de nuevo o contáctanos directamente.');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

// ==========================================
// SCROLL ANIMATIONS
// ==========================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            entry.target.classList.add('animated');
        }
    });
}, observerOptions);

// Fade up animation for cards
document.querySelectorAll('.benefit-item, .service-card, .analisis-card, .main-upload-card').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
    observer.observe(el);
});

// Fade up animation for product cards
document.querySelectorAll('.detailed-product-card').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(40px)';
    el.style.transition = `opacity 0.7s ease ${index * 0.15}s, transform 0.7s ease ${index * 0.15}s`;
    observer.observe(el);
});

// Fade up animation for pricing cards
document.querySelectorAll('.pricing-card').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(40px) scale(0.95)';
    el.style.transition = `opacity 0.7s ease ${index * 0.1}s, transform 0.7s ease ${index * 0.1}s`;
    observer.observe(el);
});

// Fade in animation for section titles
document.querySelectorAll('section h2').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    observer.observe(el);
});

// Fade in and expand animation for dividers
document.querySelectorAll('.section-divider').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'scaleX(0)';
    el.style.transition = 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s';
    observer.observe(el);
});

// Fade in animation for hero stats
document.querySelectorAll('.hero-stat').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'scale(0.8)';
    el.style.transition = `opacity 0.6s ease ${0.5 + index * 0.2}s, transform 0.6s ease ${0.5 + index * 0.2}s`;

    setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
    }, 100);
});

// ==========================================
// BEFORE/AFTER COMPARISON SLIDER
// ==========================================
const comparisonSlider = document.getElementById('comparisonSlider');
const beforeImage = document.getElementById('beforeImage');
const comparisonWrapper = document.querySelector('.comparison-wrapper');

if (comparisonSlider && beforeImage && comparisonWrapper) {
    let isDragging = false;

    // Function to update slider position
    function updateSlider(percentage) {
        // Constrain percentage between 0 and 100
        percentage = Math.max(0, Math.min(100, percentage));

        // Update slider position
        comparisonSlider.style.left = percentage + '%';

        // Update clip-path for before image
        beforeImage.style.clipPath = `polygon(0 0, ${percentage}% 0, ${percentage}% 100%, 0 100%)`;
    }

    // Mouse/Touch event handlers
    function startDragging(e) {
        isDragging = true;
        e.preventDefault();
    }

    function stopDragging() {
        isDragging = false;
    }

    function onMove(e) {
        if (!isDragging) return;

        const rect = comparisonWrapper.getBoundingClientRect();
        const x = (e.type.includes('touch') ? e.touches[0].clientX : e.clientX) - rect.left;
        const percentage = (x / rect.width) * 100;

        updateSlider(percentage);
    }

    // Mouse events
    comparisonSlider.addEventListener('mousedown', startDragging);
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('mousemove', onMove);

    // Touch events
    comparisonSlider.addEventListener('touchstart', startDragging);
    document.addEventListener('touchend', stopDragging);
    document.addEventListener('touchmove', onMove);

    // Click on wrapper to move slider
    comparisonWrapper.addEventListener('click', (e) => {
        if (e.target === comparisonSlider || e.target.parentElement === comparisonSlider) return;

        const rect = comparisonWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;

        updateSlider(percentage);
    });

    // Initial animation - slide from left to right
    setTimeout(() => {
        let currentPosition = 0;
        const targetPosition = 50;
        const duration = 1500;
        const startTime = Date.now();

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-in-out)
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            currentPosition = easeProgress * targetPosition;
            updateSlider(currentPosition);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        animate();
    }, 500);
}

// Fade in animation for comparison features
document.querySelectorAll('.comparison-feature').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.6s ease ${index * 0.15}s, transform 0.6s ease ${index * 0.15}s`;
    observer.observe(el);
});

// ==========================================
// ANIMATED STATISTICS COUNTER - TEMPORALMENTE DESACTIVADO
// ==========================================
/*
function animateCounter(element, target, suffix = '', duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }

        // Format numbers with commas for thousands
        const displayValue = Math.floor(current).toLocaleString('es-CO');
        element.textContent = displayValue + suffix;
    }, 16);
}

// Observer for stats section
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
            entry.target.classList.add('counted');

            // Animate all stat numbers in this section
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach((statNumber, index) => {
                const target = parseInt(statNumber.getAttribute('data-target'));
                const suffix = statNumber.getAttribute('data-suffix') || '';

                // Delay each counter slightly for staggered effect
                setTimeout(() => {
                    animateCounter(statNumber, target, suffix, 2000);
                }, index * 200);
            });
        }
    });
}, {
    threshold: 0.3
});

// Observe stats section
const statsSection = document.querySelector('.stats-section');
if (statsSection) {
    statsObserver.observe(statsSection);
}

// Fade in animation for stat cards
document.querySelectorAll('.stat-card').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(40px) scale(0.95)';
    el.style.transition = `opacity 0.7s ease ${index * 0.15}s, transform 0.7s ease ${index * 0.15}s`;
    observer.observe(el);
});
*/
