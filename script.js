// 在文件开头修改密码存储方式
const PASSWORD_KEY = 'system_password';
let SYSTEM_PASSWORD = localStorage.getItem(PASSWORD_KEY) || "123456";

// 显示修改密码弹窗
function showChangePassword() {
    document.getElementById('changePasswordModal').style.display = 'block';
}

// 隐藏修改密码弹窗
function hideChangePassword() {
    document.getElementById('changePasswordModal').style.display = 'none';
    // 清空输入框
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

// 修改密码
function changePassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // 验证原密码
    if (oldPassword !== SYSTEM_PASSWORD) {
        alert('原密码错误！');
        return;
    }

    // 验证新密码
    if (newPassword.length < 6) {
        alert('新密码长度不能少于6位！');
        return;
    }

    // 验证确认密码
    if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致！');
        return;
    }

    // 更新密码
    SYSTEM_PASSWORD = newPassword;
    localStorage.setItem(PASSWORD_KEY, SYSTEM_PASSWORD);

    // 如果有 Firebase 连接，则保存到云端
    if (window.db) {
        const passwordRef = window.db.ref(window.db.database, 'system_password');
        window.db.set(passwordRef, SYSTEM_PASSWORD)
            .catch(e => console.error('保存密码到云端失败：', e));
    }

    alert('密码修改成功！');
    hideChangePassword();
}

// 修改登录函数
function login() {
    const password = document.getElementById('password').value;
    if (password === SYSTEM_PASSWORD) {
        sessionStorage.setItem('isLoggedIn', 'true');
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
        updateTable(); // 登录成功后更新表格
    } else {
        alert('密码错误，请重试！');
        document.getElementById('password').value = '';
    }
}

// 修改登录状态检查函数
function checkLoginStatus() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    
    if (isLoggedIn) {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
    } else {
        document.getElementById('loginForm').style.display = 'flex';
        document.getElementById('mainContainer').style.display = 'none';
    }
    return isLoggedIn;
}

// 修改登出函数
function logout() {
    sessionStorage.removeItem('isLoggedIn');
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('mainContainer').style.display = 'none';
}

// 修改页面加载事件
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 加载专利数据
        const savedPatents = localStorage.getItem('patents');
        if (savedPatents) {
            patents = JSON.parse(savedPatents);
        }

        // 加载金额设置
        const savedAmounts = localStorage.getItem('patentAmounts');
        if (savedAmounts) {
            const amounts = JSON.parse(savedAmounts);
            document.getElementById('inventionAmount').value = amounts.invention;
            document.getElementById('utilityAmount').value = amounts.utility;
            document.getElementById('designAmount').value = amounts.design;
        }

        // 检查登录状态并更新界面
        const isLoggedIn = checkLoginStatus();
        if (isLoggedIn) {
            updateTable();
        }
    } catch (e) {
        console.error('加载数据时出错：', e);
    }
});

// 存储专利数据的数组
let patents = [];

// 添加图片预览功能
document.getElementById('patentImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            preview.style.display = 'block';
            preview.innerHTML = `<img src="${e.target.result}" alt="预览图片">`;
        }
        reader.readAsDataURL(file);
    }
});

// 修改提交函数
function submitPatent() {
    const patentName = document.getElementById('patentName').value.trim();
    const patentType = document.getElementById('patentType').value;
    const editingId = document.getElementById('inputForm').getAttribute('data-editing-id');
    const originalImage = document.getElementById('inputForm').getAttribute('data-original-image');
    let inventorDetails = [];
    let inventors = new Set(); // 用于检查重复发明人
    
    // 验证专利类型
    if (!patentType) {
        alert('请选择专利类型！');
        return;
    }
    
    // 收集非空的发明人和比例
    for (let i = 1; i <= 6; i++) {
        const inventor = document.getElementById(`inventor${i}`).value.trim();
        const ratio = document.getElementById(`ratio${i}`).value.trim();
        
        if (inventor && ratio !== '') {
            // 检查发明人是否重复
            if (inventors.has(inventor)) {
                alert(`发明人"${inventor}"重复录入！每次录入中发明人姓名不能重复。`);
                return;
            }
            inventors.add(inventor);
            
            inventorDetails.push({
                inventor: inventor,
                ratio: parseFloat(ratio)
            });
        }
    }
    
    // 验证输入
    if (!patentName) {
        alert('请输入专利名称！');
        return;
    }
    
    if (inventorDetails.length === 0) {
        alert('请至少输入一位发明人和对应的分配比例！');
        return;
    }
    
    // 计算总比例
    const totalRatio = inventorDetails.reduce((sum, detail) => sum + detail.ratio, 0);
    
    // 验证总比例是否为100
    if (Math.abs(totalRatio - 100) > 0.01) {
        alert('所有发明人的奖励分配比例之和必须等于100！当前总和为：' + totalRatio);
        return;
    }
    
    // 获取图片数据
    const imageInput = document.getElementById('patentImage');
    let imageData = null;

    // 如果是编辑模式且没有选择新图片，使用原图片
    if (editingId && !imageInput.files.length && originalImage) {
        const newPatent = {
            id: parseInt(editingId),
            patentName,
            patentType,
            inventorDetails,
            image: originalImage
        };

        // 更新记录
        const index = patents.findIndex(p => p.id === parseInt(editingId));
        if (index !== -1) {
            patents[index] = newPatent;
            saveToLocalStorage();
            clearForm();
            updateTable();
            showTable();
            alert('专利信息修改成功！');
        }
    } else if (imageInput.files && imageInput.files[0]) {
        // 有新图片的情况
        const reader = new FileReader();
        reader.onload = function(e) {
            const newPatent = {
                id: editingId ? parseInt(editingId) : Date.now(),
                patentName,
                patentType,
                inventorDetails,
                image: e.target.result
            };

            if (editingId) {
                // 编辑模式
                const index = patents.findIndex(p => p.id === parseInt(editingId));
                if (index !== -1) {
                    patents[index] = newPatent;
                }
            } else {
                // 新增模式
                patents.push(newPatent);
            }

            saveToLocalStorage();
            clearForm();
            updateTable();
            showTable();
            alert(editingId ? '专利信息修改成功！' : '专利信息录入成功！');
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        // 没有图片的情况
        const newPatent = {
            id: editingId ? parseInt(editingId) : Date.now(),
            patentName,
            patentType,
            inventorDetails
        };

        if (editingId) {
            const index = patents.findIndex(p => p.id === parseInt(editingId));
            if (index !== -1) {
                patents[index] = newPatent;
            }
        } else {
            patents.push(newPatent);
        }

        saveToLocalStorage();
        clearForm();
        updateTable();
        showTable();
        alert(editingId ? '专利信息修改成功！' : '专利信息录入成功！');
    }
}

// 清空表单
function clearForm() {
    document.getElementById('patentName').value = '';
    document.getElementById('patentType').value = '';
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`inventor${i}`).value = '';
        document.getElementById(`ratio${i}`).value = '';
    }
    document.getElementById('patentImage').value = '';
    const preview = document.getElementById('imagePreview');
    preview.style.display = 'none';
    preview.innerHTML = '';
    
    // 清除编辑状态和原图片数据
    document.getElementById('inputForm').removeAttribute('data-editing-id');
    document.getElementById('inputForm').removeAttribute('data-original-image');
}

// 修改保存函数
function saveToLocalStorage() {
    try {
        localStorage.setItem('patents', JSON.stringify(patents));
        localStorage.setItem('patentAmounts', JSON.stringify({
            invention: document.getElementById('inventionAmount').value,
            utility: document.getElementById('utilityAmount').value,
            design: document.getElementById('designAmount').value
        }));
    } catch (e) {
        console.error('保存数据时出错：', e);
    }
}

// 修改数据加载函数
async function loadData() {
    try {
        if (window.db) {
            // 加载专利数据
            const { data: patentsData, error: patentsError } = await window.db
                .from('patents')
                .select('*');

            if (patentsError) throw patentsError;

            if (patentsData) {
                patents = patentsData.map(p => ({
                    id: p.id,
                    patentName: p.patent_name,
                    patentType: p.patent_type,
                    inventorDetails: JSON.parse(p.inventor_details),
                    image: p.image
                }));
                localStorage.setItem('patents', JSON.stringify(patents));
            }

            // 加载设置
            const { data: settingsData, error: settingsError } = await window.db
                .from('settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (!settingsError && settingsData) {
                document.getElementById('inventionAmount').value = settingsData.invention_amount;
                document.getElementById('utilityAmount').value = settingsData.utility_amount;
                document.getElementById('designAmount').value = settingsData.design_amount;
            }
        }
    } catch (e) {
        console.error('加载数据时出错：', e);
    }
}

// 添加实时订阅
function setupRealtime() {
    if (window.db) {
        window.db
            .channel('patents_changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'patents' }, 
                payload => {
                    loadData().then(() => {
                        if (sessionStorage.getItem('isLoggedIn') === 'true') {
                            updateTable();
                        }
                    });
                }
            )
            .subscribe();
    }
}

// 在页面加载时设置实时订阅
document.addEventListener('DOMContentLoaded', () => {
    setupRealtime();
    // ... 其他代码保持不变
});

// 修改返回录入页面函数
function backToForm() {
    // 隐藏数据表格
    document.getElementById('dataTable').style.display = 'none';
    // 显示录入表单
    document.getElementById('inputForm').style.display = 'block';
    // 重置表单
    clearForm();
    // 重置表单的样式
    const formSection = document.querySelector('.form-section');
    formSection.style.height = 'calc(100vh - 40px)';
    formSection.style.display = 'flex';
    formSection.style.flexDirection = 'column';
    formSection.style.overflow = 'hidden';

    // 重置其他容器的样式
    const formContainer = document.querySelector('.form-container');
    formContainer.style.flex = '1';
    formContainer.style.minHeight = '0';
    formContainer.style.display = 'flex';
    formContainer.style.gap = '20px';
    formContainer.style.overflow = 'auto';

    // 重置输入列的样式
    const inputColumns = document.querySelectorAll('.input-column');
    inputColumns.forEach(column => {
        column.style.flex = '1';
        column.style.display = 'flex';
        column.style.flexDirection = 'column';
        column.style.overflow = 'auto';
    });
}

// 修改金额计算函数
function calculateAmount(patentType, ratio) {
    let baseAmount;
    switch (patentType) {
        case "发明专利":
            baseAmount = parseFloat(document.getElementById('inventionAmount').value) || 2000;
            break;
        case "实用新型专利":
            baseAmount = parseFloat(document.getElementById('utilityAmount').value) || 1000;
            break;
        case "外观专利":
            baseAmount = parseFloat(document.getElementById('designAmount').value) || 1000;
            break;
        default:
            baseAmount = 0;
    }
    return (baseAmount * ratio / 100).toFixed(2);
}

// 导出为Excel文件
function exportToExcel() {
    // 1. 详细数据部分
    let csvContent = "=== 详细数据 ===\n";
    csvContent += "序号,专利名称,专利类型,发明人,奖励分配比例,金额\n";
    
    patents.forEach((patent, patentIndex) => {
        patent.inventorDetails.forEach((detail, detailIndex) => {
            const amount = calculateAmount(patent.patentType, detail.ratio);
            if (detailIndex === 0) {
                csvContent += `${patentIndex + 1},${patent.patentName},${patent.patentType},${detail.inventor},${detail.ratio}%,${amount}\n`;
            } else {
                csvContent += `,,,,${detail.ratio}%,${amount}\n`;
            }
        });
    });
    
    // 2. 专利类型统计
    csvContent += "\n=== 专利类型统计 ===\n";
    csvContent += "专利类型,数量\n";
    
    const typeStats = patents.reduce((acc, patent) => {
        acc[patent.patentType] = (acc[patent.patentType] || 0) + 1;
        return acc;
    }, {});
    
    Object.entries(typeStats).forEach(([type, count]) => {
        csvContent += `${type},${count}\n`;
    });
    
    // 3. 发明人统计
    csvContent += "\n=== 发明人参与统计 ===\n";
    csvContent += "发明人,参与专利数,总奖励比例,总金额\n";
    
    const inventorStats = {};
    patents.forEach(patent => {
        patent.inventorDetails.forEach(detail => {
            if (!inventorStats[detail.inventor]) {
                inventorStats[detail.inventor] = {
                    patentCount: 0,
                    totalRatio: 0
                };
            }
            inventorStats[detail.inventor].patentCount += 1;
            inventorStats[detail.inventor].totalRatio += detail.ratio;
        });
    });
    
    Object.entries(inventorStats).forEach(([inventor, stats]) => {
        // 计算总金额
        let totalAmount = 0;
        patents.forEach(patent => {
            const detail = patent.inventorDetails.find(d => d.inventor === inventor);
            if (detail) {
                totalAmount += parseFloat(calculateAmount(patent.patentType, detail.ratio));
            }
        });
        
        csvContent += `${inventor},${stats.patentCount},${stats.totalRatio}%,${totalAmount.toFixed(2)}\n`;
    });
    
    // 4. 专利类型-发明人交叉统计
    csvContent += "\n=== 专利类型-发明人交叉统计 ===\n";
    csvContent += "发明人,发明专利数,实用新型专利数\n";
    
    const crossStats = {};
    patents.forEach(patent => {
        patent.inventorDetails.forEach(detail => {
            if (!crossStats[detail.inventor]) {
                crossStats[detail.inventor] = {
                    invention: 0,
                    utility: 0
                };
            }
            if (patent.patentType === "发明专利") {
                crossStats[detail.inventor].invention += 1;
            } else if (patent.patentType === "实用新型专利") {
                crossStats[detail.inventor].utility += 1;
            }
        });
    });
    
    Object.entries(crossStats).forEach(([inventor, stats]) => {
        csvContent += `${inventor},${stats.invention},${stats.utility}\n`;
    });

    // 导出文件
    const blob = new Blob(["\ufeff" + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '专利信息汇总.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 更新表格显示
function updateTable() {
    const tableBody = document.getElementById('patentTableBody');
    tableBody.innerHTML = '';

    patents.forEach((patent, index) => {
        // 添加专利行
        const patentRow = document.createElement('tr');
        patentRow.className = 'patent-group';
        
        // 计算第一个发明人的金额
        const amount1 = calculateAmount(patent.patentType, patent.inventorDetails[0].ratio);
        
        patentRow.innerHTML = `
            <td rowspan="${patent.inventorDetails.length}">${index + 1}</td>
            <td rowspan="${patent.inventorDetails.length}">
                <div class="patent-name-cell">
                    <span>${patent.patentName}</span>
                    ${patent.image ? `<img src="${patent.image}" class="patent-thumbnail" onclick="showImage('${patent.image}')">` : ''}
                </div>
            </td>
            <td rowspan="${patent.inventorDetails.length}">${patent.patentType}</td>
            <td>${patent.inventorDetails[0].inventor}</td>
            <td>${patent.inventorDetails[0].ratio}%</td>
            <td>${amount1}</td>
            <td rowspan="${patent.inventorDetails.length}">
                <button onclick="editPatent('${patent.id}')" class="action-button edit-button">编辑</button>
                <button onclick="deletePatent('${patent.id}')" class="action-button delete-button">删除</button>
            </td>
        `;
        tableBody.appendChild(patentRow);

        // 添加其他发明人行
        for (let i = 1; i < patent.inventorDetails.length; i++) {
            const inventorRow = document.createElement('tr');
            inventorRow.className = 'inventor-row';
            
            // 计算其他发明人的金额
            const amount = calculateAmount(patent.patentType, patent.inventorDetails[i].ratio);
            
            inventorRow.innerHTML = `
                <td>${patent.inventorDetails[i].inventor}</td>
                <td>${patent.inventorDetails[i].ratio}%</td>
                <td>${amount}</td>
            `;
            tableBody.appendChild(inventorRow);
        }
    });

    // 更新计信息
    updateStatistics();
}

function updateStatistics() {
    // 1. 专利类型统计
    const typeStats = patents.reduce((acc, patent) => {
        acc[patent.patentType] = (acc[patent.patentType] || 0) + 1;
        return acc;
    }, {});
    
    const typeStatsBody = document.querySelector('#typeStatsTable tbody');
    typeStatsBody.innerHTML = Object.entries(typeStats)
        .map(([type, count]) => `
            <tr>
                <td>${type}</td>
                <td>${count}</td>
            </tr>
        `).join('');

    // 2. 发明人统计
    const inventorStats = {};
    patents.forEach(patent => {
        patent.inventorDetails.forEach(detail => {
            if (!inventorStats[detail.inventor]) {
                inventorStats[detail.inventor] = {
                    patentCount: 0,
                    totalRatio: 0
                };
            }
            inventorStats[detail.inventor].patentCount += 1;
            inventorStats[detail.inventor].totalRatio += detail.ratio;
        });
    });
    
    const inventorStatsBody = document.querySelector('#inventorStatsTable tbody');
    inventorStatsBody.innerHTML = Object.entries(inventorStats)
        .map(([inventor, stats]) => {
            // 计算总金额
            let totalAmount = 0;
            patents.forEach(patent => {
                const detail = patent.inventorDetails.find(d => d.inventor === inventor);
                if (detail) {
                    totalAmount += parseFloat(calculateAmount(patent.patentType, detail.ratio));
                }
            });
            
            return `
                <tr>
                    <td>${inventor}</td>
                    <td>${stats.patentCount}</td>
                    <td>${stats.totalRatio}%</td>
                    <td>${totalAmount.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

    // 3. 交叉统计
    const crossStats = {};
    patents.forEach(patent => {
        patent.inventorDetails.forEach(detail => {
            if (!crossStats[detail.inventor]) {
                crossStats[detail.inventor] = {
                    invention: 0,
                    utility: 0
                };
            }
            if (patent.patentType === "发明专利") {
                crossStats[detail.inventor].invention += 1;
            } else if (patent.patentType === "实用新型专利") {
                crossStats[detail.inventor].utility += 1;
            }
        });
    });
    
    const crossStatsBody = document.querySelector('#crossStatsTable tbody');
    crossStatsBody.innerHTML = Object.entries(crossStats)
        .map(([inventor, stats]) => `
            <tr>
                <td>${inventor}</td>
                <td>${stats.invention}</td>
                <td>${stats.utility}</td>
            </tr>
        `).join('');
}

// 修改删除专利函数
function deletePatent(patentId) {
    if (confirm('确定要删除这条专利记录吗？')) {
        try {
            // 确保使用 Number 转换 ID，以处理可能的字符串ID
            const idToDelete = Number(patentId);
            // 过滤掉要删除的记录
            patents = patents.filter(p => Number(p.id) !== idToDelete);
            
            // 保存更新
            saveToLocalStorage();
            // 更新表格显示
            updateTable();
            // 显示删除成功提示
            const messageEl = document.getElementById('deleteMessage');
            messageEl.textContent = '删除成功';
            messageEl.classList.add('show');
            setTimeout(() => {
                messageEl.classList.remove('show');
                setTimeout(() => {
                    messageEl.textContent = '';
                }, 300); // 等待淡出动画完成后清除文本
            }, 2000);
        } catch (e) {
            console.error('删除失败:', e);
        }
    }
}

// 修改编辑专利函数
function editPatent(patentId) {
    const patent = patents.find(p => p.id === parseInt(patentId));
    if (!patent) return;

    // 换到录入页面
    backToForm();
    
    // 填充表单
    document.getElementById('patentName').value = patent.patentName;
    document.getElementById('patentType').value = patent.patentType;
    
    // 先清空所有输入框
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`inventor${i}`).value = '';
        document.getElementById(`ratio${i}`).value = '';
    }
    
    // 填充发明人和比例
    patent.inventorDetails.forEach((detail, index) => {
        const i = index + 1;
        document.getElementById(`inventor${i}`).value = detail.inventor;
        document.getElementById(`ratio${i}`).value = detail.ratio;
    });

    // 保存原有图片数据
    document.getElementById('inputForm').setAttribute('data-editing-id', patentId.toString());
    document.getElementById('inputForm').setAttribute('data-original-image', patent.image || '');
    
    // 如果有原图片，显示预览
    if (patent.image) {
        const preview = document.getElementById('imagePreview');
        preview.style.display = 'block';
        preview.innerHTML = `<img src="${patent.image}" alt="预览图片">`;
    } else {
        const preview = document.getElementById('imagePreview');
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
    
    // 清空文件输入框
    document.getElementById('patentImage').value = '';
}

function showTable() {
    document.getElementById('inputForm').style.display = 'none';
    document.getElementById('dataTable').style.display = 'block';
}

// 添加图片查看功能
function showImage(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modal.style.display = "block";
    modalImg.src = imageUrl;
}

// 关闭模态框
document.querySelector('.close-modal').onclick = function() {
    document.getElementById('imageModal').style.display = "none";
}

// 添加一键删除所有数据的功能
function deleteAllPatents() {
    if (confirm('确定要删除所有专利信息吗？此操作不可恢复！')) {
        if (confirm('再次确认：删除后将无法恢复，是否继续？')) {
            try {
                // 清空数据数组
                patents = [];
                
                // 清除本地存储
                localStorage.removeItem('patents');
                
                // 如果有Firebase连接，也清除云端数据
                if (window.db) {
                    const patentsRef = window.db.ref(window.db.database, 'patents');
                    window.db.set(patentsRef, null);
                }
                
                // 更新表格显示
                updateTable();
                
                // 显示删除成功提示
                const messageEl = document.getElementById('deleteMessage');
                messageEl.textContent = '所有数据已删除';
                messageEl.classList.add('show');
                setTimeout(() => {
                    messageEl.classList.remove('show');
                    setTimeout(() => {
                        messageEl.textContent = '';
                    }, 300);
                }, 2000);
            } catch (e) {
                console.error('删除所有数据时出错:', e);
                alert('删除失败，请刷新页面后重试！');
            }
        }
    }
} 